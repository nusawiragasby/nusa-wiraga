"""Endpoint data tes kebugaran atlet untuk halaman /kebugaran.

Modul ini TIDAK mengimpor server.py (menghindari impor melingkar). server.py
memanggil make_uji_router(db, get_current_user, hash_password, verify_password)
lalu memasang router hasilnya ke aplikasi FastAPI.

Koleksi Mongo yang dipakai:
  uji_atlet  : satu dokumen per atlet (id unik dari klien, berisi sesiTes[])
  uji_norma  : satu dokumen (id "default") berisi item tes & norma kustom
  users      : sudah ada — dipakai untuk akun panitia/pelatih (field role)
"""
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field

STAFF_ROLES = {"admin", "pelatih"}
SESI_KEYS = ("id", "tanggal", "lokasi", "pelatih", "petugas", "tests", "testsAktif")
NORMA_ID = "default"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _usia(tgl_lahir: Optional[str], tgl_acuan: Optional[str]) -> Optional[int]:
    """Usia (tahun) pada tanggal acuan; None bila tanggal tidak lengkap."""
    if not tgl_lahir or not tgl_acuan:
        return None
    try:
        b = date.fromisoformat(str(tgl_lahir)[:10])
        n = date.fromisoformat(str(tgl_acuan)[:10])
    except ValueError:
        return None
    return n.year - b.year - ((n.month, n.day) < (b.month, b.day))


def _bersihkan_sesi(sesi: Dict[str, Any]) -> Dict[str, Any]:
    """Ambil hanya field sesi yang dikenal, supaya dokumen tetap rapi."""
    out = {k: sesi.get(k) for k in SESI_KEYS if k in sesi}
    tests = out.get("tests")
    out["tests"] = dict(tests) if isinstance(tests, dict) else {}
    aktif = out.get("testsAktif")
    out["testsAktif"] = {k: bool(v) for k, v in aktif.items()} if isinstance(aktif, dict) else {}
    return out


class AtletPayload(BaseModel):
    id: str = Field(min_length=1, max_length=64)
    nama: str = Field(min_length=1, max_length=120)
    tgl: Optional[str] = None
    jk: Optional[str] = None
    klub: Optional[str] = None
    sesiTes: List[Dict[str, Any]] = []


class NormaPayload(BaseModel):
    customTests: Dict[str, Any]


class UserIn(BaseModel):
    email: EmailStr
    name: str = ""
    password: str = Field(min_length=8)
    role: str = "pelatih"


class UserPatch(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None


def make_uji_router(db, get_current_user, hash_password, verify_password,
                    admin_email: str = "") -> APIRouter:
    router = APIRouter(prefix="/api/uji", tags=["uji"])

    def _peran(user: dict) -> str:
        return (user.get("role") or "admin").lower()

    async def staff(user: dict = Depends(get_current_user)) -> dict:
        if _peran(user) not in STAFF_ROLES:
            raise HTTPException(status_code=403, detail="Akun ini tidak berhak mengelola data tes")
        return user

    async def admin(user: dict = Depends(get_current_user)) -> dict:
        if _peran(user) != "admin":
            raise HTTPException(status_code=403, detail="Hanya admin yang boleh melakukan ini")
        return user

    # ---------------- STATE (atlet + norma) ----------------
    @router.get("/state")
    async def state(user: dict = Depends(staff)):
        atlet = await db.uji_atlet.find({}, {"_id": 0}).to_list(length=None)
        norma = await db.uji_norma.find_one({"id": NORMA_ID}, {"_id": 0}) or {}
        return {
            "atlet": atlet,
            "norma": norma.get("customTests") or {"defs": {}, "norms": {}, "deleted": []},
            "role": _peran(user),
            "email": user.get("email"),
            "name": user.get("name") or user.get("email"),
        }

    # ---------------- ATLET ----------------
    @router.put("/atlet/{atlet_id}")
    async def simpan_atlet(atlet_id: str, body: AtletPayload, user: dict = Depends(staff)):
        if body.id != atlet_id:
            raise HTTPException(status_code=400, detail="id pada URL dan body berbeda")
        doc = {
            "id": body.id,
            "nama": body.nama.strip(),
            "tgl": body.tgl,
            "jk": body.jk,
            "klub": (body.klub or "").strip(),
            "sesiTes": [_bersihkan_sesi(s) for s in body.sesiTes],
            "updated_at": _now_iso(),
            "updated_by": user.get("email"),
        }
        await db.uji_atlet.update_one({"id": atlet_id}, {"$set": doc}, upsert=True)
        return {"ok": True, "id": atlet_id}

    @router.delete("/atlet/{atlet_id}")
    async def hapus_atlet(atlet_id: str, user: dict = Depends(staff)):
        res = await db.uji_atlet.delete_one({"id": atlet_id})
        return {"ok": True, "dihapus": res.deleted_count}

    # ---------------- NORMA KUSTOM ----------------
    @router.put("/norma")
    async def simpan_norma(body: NormaPayload, user: dict = Depends(admin)):
        await db.uji_norma.update_one(
            {"id": NORMA_ID},
            {"$set": {"id": NORMA_ID, "customTests": body.customTests,
                      "updated_at": _now_iso(), "updated_by": user.get("email")}},
            upsert=True,
        )
        return {"ok": True}

    # ---------------- REKAP PUBLIK (tanpa login) ----------------
    @router.get("/public/rekap")
    async def rekap_publik():
        """Hanya data yang aman ditampilkan umum.

        Tanggal lahir TIDAK dikirim; sebagai gantinya tiap sesi membawa `usia`
        saat tes, karena norma penilaian butuh usia, bukan tanggal lahir.
        """
        rows = await db.uji_atlet.find(
            {}, {"_id": 0, "updated_by": 0, "updated_at": 0}
        ).to_list(length=None)
        for a in rows:
            lahir = a.pop("tgl", None)
            a["sesiTes"] = [
                {
                    **{k: v for k, v in s.items() if k != "testsAktif"},
                    "usia": _usia(lahir, s.get("tanggal")),
                }
                for s in (a.get("sesiTes") or [])
            ]
        rows.sort(key=lambda x: (x.get("nama") or "").lower())
        return {"atlet": rows, "diperbarui": _now_iso()}

    # ---------------- AKUN PANITIA / PELATIH ----------------
    @router.get("/users")
    async def daftar_user(user: dict = Depends(admin)):
        rows = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(length=None)
        for r in rows:
            r.setdefault("role", "admin")
        rows.sort(key=lambda r: (r.get("role", ""), (r.get("email") or "").lower()))
        return rows

    @router.post("/users")
    async def buat_user(body: UserIn, user: dict = Depends(admin)):
        email = body.email.lower()
        peran = body.role.lower()
        if peran not in STAFF_ROLES:
            raise HTTPException(status_code=400, detail="Peran harus 'admin' atau 'pelatih'")
        if await db.users.find_one({"email": email}):
            raise HTTPException(status_code=400, detail="Email sudah terdaftar")
        await db.users.insert_one({
            "email": email,
            "name": body.name.strip() or email,
            "role": peran,
            "password_hash": hash_password(body.password),
            "created_at": _now_iso(),
        })
        return {"ok": True, "email": email, "role": peran}

    @router.patch("/users/{email}")
    async def ubah_user(email: str, body: UserPatch, user: dict = Depends(admin)):
        email = email.lower()
        target = await db.users.find_one({"email": email})
        if not target:
            raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
        ubah: Dict[str, Any] = {}
        if body.name is not None:
            ubah["name"] = body.name.strip() or email
        if body.password:
            if len(body.password) < 8:
                raise HTTPException(status_code=400, detail="Kata sandi minimal 8 karakter")
            ubah["password_hash"] = hash_password(body.password)
        if body.role is not None:
            peran = body.role.lower()
            if peran not in STAFF_ROLES:
                raise HTTPException(status_code=400, detail="Peran harus 'admin' atau 'pelatih'")
            if email == admin_email and peran != "admin":
                raise HTTPException(status_code=400, detail="Akun admin utama tidak boleh diturunkan perannya")
            ubah["role"] = peran
        if not ubah:
            return {"ok": True, "diubah": []}
        await db.users.update_one({"email": email}, {"$set": ubah})
        return {"ok": True, "diubah": sorted(ubah.keys())}

    @router.delete("/users/{email}")
    async def hapus_user(email: str, user: dict = Depends(admin)):
        email = email.lower()
        if email == admin_email:
            raise HTTPException(status_code=400, detail="Akun admin utama tidak boleh dihapus")
        if email == (user.get("email") or "").lower():
            raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")
        res = await db.users.delete_one({"email": email})
        if not res.deleted_count:
            raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
        return {"ok": True}

    return router
