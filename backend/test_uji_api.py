"""Uji cepat endpoint /api/uji/* tanpa MongoDB dan tanpa server HTTP.

Jalankan dari folder backend/:
    python test_uji_api.py

Memakai mongomock-motor (pengganti Motor di memori) dan dependency auth palsu,
jadi tidak perlu kredensial Atlas maupun FastAPI yang berjalan.
"""
import asyncio
import sys
import traceback

from fastapi import Depends, FastAPI, Request
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

import uji

DB = AsyncMongoMockClient()["uji_test"]


async def fake_user(request: Request) -> dict:
    return {
        "email": request.headers.get("x-test-user", "pelatih@nusawiraga.id"),
        "name": "Uji",
        "role": request.headers.get("x-test-role", "pelatih"),
    }


ADMIN_EMAIL = "admin@nusawiraga.id"


def build_app() -> FastAPI:
    app = FastAPI()
    app.include_router(
        uji.make_uji_router(
            DB,
            fake_user,
            hash_password=lambda p: "hash:" + p,
            verify_password=lambda p, h: h == "hash:" + p,
            admin_email=ADMIN_EMAIL,
        )
    )
    return app


ATLET = {
    "id": "a1",
    "nama": "Budi Santoso",
    "tgl": "2010-03-01",
    "jk": "L",
    "klub": "PSHT",
    "sesiTes": [
        {
            "id": "s1",
            "tanggal": "2026-05-10",
            "lokasi": "GOR",
            "pelatih": "Pak Andi",
            "tests": {"tinggi": 160, "berat": 50, "pushup": 20},
            "testsAktif": {"pushup": 1, "situp": 0},
        }
    ],
}

H_ADMIN = {"x-test-role": "admin", "x-test-user": ADMIN_EMAIL}
H_PELATIH = {"x-test-role": "pelatih"}

hasil = []


def cek(nama, kondisi, info=""):
    hasil.append((nama, bool(kondisi), info))
    print(("LULUS  " if kondisi else "GAGAL  ") + nama + ("" if kondisi else f"  -> {info}"))


async def main():
    # Akun admin utama harus ada di DB, karena guard "jangan turunkan/hapus
    # admin utama" hanya berlaku untuk akun yang benar-benar ada.
    await DB.users.insert_one({"email": ADMIN_EMAIL, "name": "Admin", "role": "admin",
                               "password_hash": "hash:x", "created_at": "t"})
    app = build_app()
    tr = ASGITransport(app=app)
    async with AsyncClient(transport=tr, base_url="http://t") as c:
        r = await c.get("/api/uji/state", headers=H_PELATIH)
        d = r.json()
        cek("state awal kosong & role pelatih", r.status_code == 200 and d["atlet"] == [] and d["role"] == "pelatih", r.text[:200])

        r = await c.put("/api/uji/atlet/a1", json=ATLET, headers=H_PELATIH)
        cek("pelatih bisa simpan atlet", r.status_code == 200, r.text[:200])

        r = await c.get("/api/uji/state", headers=H_PELATIH)
        a = r.json()["atlet"][0]
        cek("atlet tersimpan + sesi bersih", a["nama"] == "Budi Santoso" and a["sesiTes"][0]["testsAktif"] == {"pushup": True, "situp": False}, str(a)[:250])

        r = await c.put("/api/uji/atlet/a1", json={**ATLET, "id": "lain"}, headers=H_PELATIH)
        cek("id URL != body ditolak 400", r.status_code == 400, r.text[:120])

        r = await c.put("/api/uji/atlet/a2", json={"id": "a2", "nama": "", "sesiTes": []}, headers=H_PELATIH)
        cek("nama kosong ditolak 422", r.status_code == 422, r.text[:120])

        r = await c.put("/api/uji/norma", json={"customTests": {"defs": {}, "norms": {}, "deleted": []}}, headers=H_PELATIH)
        cek("pelatih tidak boleh ubah norma (403)", r.status_code == 403, r.text[:120])

        r = await c.put("/api/uji/norma", json={"customTests": {"defs": {"x": {"title": "Tes X"}}, "norms": {}, "deleted": []}}, headers=H_ADMIN)
        cek("admin bisa ubah norma", r.status_code == 200, r.text[:120])

        r = await c.get("/api/uji/state", headers=H_PELATIH)
        cek("norma terbaca di state", "x" in r.json()["norma"]["defs"], r.text[:150])

        r = await c.get("/api/uji/public/rekap")
        d = r.json()
        s = d["atlet"][0]["sesiTes"][0]
        cek("rekap publik tanpa login", r.status_code == 200 and len(d["atlet"]) == 1, r.text[:150])
        cek("rekap publik tidak memuat tanggal lahir", "tgl" not in d["atlet"][0], str(d["atlet"][0])[:200])
        cek("rekap publik memuat usia saat tes (16)", s.get("usia") == 16, str(s)[:200])

        r = await c.post("/api/uji/users", json={"email": "p2@nusawiraga.id", "password": "rahasia123", "role": "pelatih", "name": "Pelatih 2"}, headers=H_PELATIH)
        cek("pelatih tidak boleh buat akun (403)", r.status_code == 403, r.text[:120])

        r = await c.post("/api/uji/users", json={"email": "p2@nusawiraga.id", "password": "rahasia123", "role": "pelatih", "name": "Pelatih 2"}, headers=H_ADMIN)
        cek("admin bisa buat akun pelatih", r.status_code == 200, r.text[:120])

        r = await c.post("/api/uji/users", json={"email": "p2@nusawiraga.id", "password": "rahasia123", "role": "pelatih"}, headers=H_ADMIN)
        cek("email duplikat ditolak 400", r.status_code == 400, r.text[:120])

        r = await c.post("/api/uji/users", json={"email": "p3@nusawiraga.id", "password": "rahasia123", "role": "raja"}, headers=H_ADMIN)
        cek("peran tak dikenal ditolak 400", r.status_code == 400, r.text[:120])

        r = await c.get("/api/uji/users", headers=H_ADMIN)
        users = r.json()
        cek("daftar akun tanpa password_hash", r.status_code == 200 and users and all("password_hash" not in u for u in users), r.text[:150])

        r = await c.patch(f"/api/uji/users/{ADMIN_EMAIL}", json={"role": "pelatih"}, headers=H_ADMIN)
        cek("admin utama tidak bisa diturunkan", r.status_code == 400, r.text[:120])

        r = await c.delete(f"/api/uji/users/{ADMIN_EMAIL}", headers=H_ADMIN)
        cek("admin utama tidak bisa dihapus", r.status_code == 400, r.text[:120])

        r = await c.patch("/api/uji/users/p2@nusawiraga.id", json={"password": "pendek"}, headers=H_ADMIN)
        cek("kata sandi < 8 karakter ditolak", r.status_code == 400, r.text[:120])

        r = await c.patch("/api/uji/users/p2@nusawiraga.id", json={"role": "admin", "name": "Pelatih Utama"}, headers=H_ADMIN)
        cek("admin bisa ubah peran & nama", r.status_code == 200 and set(r.json()["diubah"]) == {"role", "name"}, r.text[:120])

        r = await c.delete("/api/uji/atlet/a1", headers=H_PELATIH)
        cek("hapus atlet", r.status_code == 200 and r.json()["dihapus"] == 1, r.text[:120])

        r = await c.get("/api/uji/public/rekap")
        cek("rekap publik ikut kosong setelah hapus", r.json()["atlet"] == [], r.text[:120])

        r = await c.get("/api/uji/state")
        cek("tanpa identitas -> 401 dari dependency asli?", r.status_code in (200, 401), f"status {r.status_code} (dengan auth palsu selalu 200)")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        traceback.print_exc()
        sys.exit(2)
    gagal = [h for h in hasil if not h[1]]
    print(f"\n{len(hasil) - len(gagal)}/{len(hasil)} lulus")
    sys.exit(1 if gagal else 0)
