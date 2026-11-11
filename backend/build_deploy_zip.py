"""Bikin paket unggah cPanel (backend_upload_uji.zip) berisi backend + /api/uji.

Dasar: server.py di folder ini — versi yang SAMA dengan produksi nusawiraga.my.id
(dicek 2026-11-11: produksi punya /api/home dan /api/register/draft, jadi yang
berjalan adalah versi repo, bukan backend_upload.zip lama dari 17 Sep).

Skrip ini menambahkan pemasangan router /api/uji (kalau belum ada) dan dua baris
create_index saat startup, lalu membungkusnya bersama uji.py.

Jalankan dari folder backend/:  python build_deploy_zip.py
"""
import ast
import io
import os
import re
import sys
import zipfile

OUT_ZIP = "backend_upload_uji.zip"
HERE = os.path.dirname(os.path.abspath(__file__))

WIRING = [
    "# --- Router data tes kebugaran (/api/uji/*) -------------------------------",
    "# Definisi ada di uji.py supaya server.py tidak makin panjang. Dependency yang",
    "# sudah ada diserahkan ke sana agar tidak terjadi impor melingkar.",
    "from uji import make_uji_router  # noqa: E402",
    "",
    "app.include_router(",
    "    make_uji_router(db, get_current_user, hash_password, verify_password, admin_email=ADMIN_EMAIL)",
    ")",
    "# -------------------------------------------------------------------------",
]

INDEXES = [
    'await db.uji_atlet.create_index("id", unique=True)',
    'await db.uji_norma.create_index("id", unique=True)',
]


def main() -> int:
    server = io.open(os.path.join(HERE, "server.py"), encoding="utf-8").read()
    nl = "\r\n" if "\r\n" in server else "\n"

    if "from uji import make_uji_router" not in server:
        anchor = "app.include_router(api_router)"
        if server.count(anchor) != 1:
            print(f"anchor include_router ditemukan {server.count(anchor)}x")
            return 1
        server = server.replace(anchor, anchor + nl + nl.join(WIRING), 1)

    if "db.uji_atlet.create_index" not in server:
        pola = r"^[ \t]*await db\.registrants\.create_index\(['\"]status['\"]\)[ \t]*$"
        cocok = re.findall(pola, server, re.M)
        if len(cocok) != 1:
            print(f"anchor create_index ditemukan {len(cocok)}x")
            return 1
        indent = cocok[0][: len(cocok[0]) - len(cocok[0].lstrip())]
        tambahan = nl + nl.join(indent + l for l in INDEXES)
        server = server.replace(cocok[0], cocok[0] + tambahan, 1)

    ast.parse(server)  # syntax error = jangan pernah dikirim

    berkas = {
        "server.py": server,
        "uji.py": io.open(os.path.join(HERE, "uji.py"), encoding="utf-8").read(),
        "requirements.txt": io.open(os.path.join(HERE, "requirements.txt"), encoding="utf-8").read(),
        "passenger_wsgi.py": io.open(os.path.join(HERE, "passenger_wsgi.py"), encoding="utf-8").read(),
        "runtime.txt": io.open(os.path.join(HERE, "runtime.txt"), encoding="utf-8").read(),
    }
    ast.parse(berkas["uji.py"])

    with zipfile.ZipFile(os.path.join(HERE, OUT_ZIP), "w", zipfile.ZIP_DEFLATED) as z:
        for nama, isi in berkas.items():
            z.writestr(nama, isi)

    print(f"OK -> {OUT_ZIP}")
    for nama, isi in berkas.items():
        print(f"  {nama}: {len(isi)} karakter")
    return 0


if __name__ == "__main__":
    sys.exit(main())
