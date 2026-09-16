from dotenv import load_dotenv
load_dotenv()

import os
import io
import csv
import json
import uuid
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, EmailStr

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nusawiraga")

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Nusa Wiraga API")
api_router = APIRouter(prefix="/api")

JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@nusawiraga.id").lower()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "onboarding@resend.dev")
if RESEND_API_KEY:
    import resend
    resend.api_key = RESEND_API_KEY

STATUS_VALUES = {"menunggu", "terverifikasi", "ditolak"}
PAYMENT_VALUES = {"belum_bayar", "lunas"}


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        header = request.headers.get("Authorization", "")
        if header.startswith("Bearer "):
            token = header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Belum terautentikasi")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Token tidak valid")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan masuk kembali")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")
    user = await db.users.find_one({"email": payload["email"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Pengguna tidak ditemukan")
    return user


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class RegisterInput(BaseModel):
    full_name: str
    contingent_school: str
    category: str
    age_class: str
    nik_or_nisn: Optional[str] = None
    email: Optional[EmailStr] = None
    phone_whatsapp: Optional[str] = None
    member_names: Optional[List[str]] = None
    weight_class: Optional[str] = None
    height_cm: Optional[float] = None
    official_coach: Optional[str] = None


class RegistrantUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None


class NewsInput(BaseModel):
    title: str
    body: str = ""
    badge: str = "Umum"
    date: str = ""


class ResultInput(BaseModel):
    category: str
    division: str
    athlete: str
    contingent: str
    medal: str


class SponsorInput(BaseModel):
    name: str
    tier: str
    logo_data: str


class MatchInput(BaseModel):
    id: Optional[str] = None
    round: int = 1              # 1 = babak pertama; naik ke arah final
    pos: int = 0               # posisi pertandingan dalam satu babak
    p1: str = ""               # nama atlet/kontingen slot 1
    p2: str = ""               # nama atlet/kontingen slot 2
    winner: Optional[int] = None   # 1 atau 2 (pemenang), atau None
    score: str = ""
    schedule: str = ""


class BracketInput(BaseModel):
    title: str
    kind: str = "bracket"      # "bracket" (gugur tunggal) | "list" (daftar pertandingan)
    size: Optional[int] = None  # untuk bracket: 4 / 8 / 16
    matches: List[MatchInput] = []
    order: int = 0


MEDAL_VALUES = {"emas", "perak", "perunggu"}
TIER_VALUES = {"platinum", "gold", "media"}
BRACKET_KINDS = {"bracket", "list"}
BRACKET_SIZES = {2, 3, 4, 8, 16, 32}


@api_router.get("/")
async def root():
    return {"message": "Nusa Wiraga API aktif"}


@api_router.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.lower()
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    now_ts = datetime.now(timezone.utc).timestamp()
    if attempt and attempt.get("locked_until", 0) > now_ts:
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan. Coba lagi dalam 15 menit.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt or {}).get("count", 0) + 1
        update = {"count": count}
        if count >= 5:
            update["locked_until"] = now_ts + 900
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Email atau kata sandi salah")

    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(str(user["_id"]), email)
    response.set_cookie(
        key="access_token", value=token, httponly=True, secure=True,
        samesite="none", max_age=43200, path="/",
    )
    # Token juga dikembalikan di body agar frontend bisa memakai header
    # Authorization: Bearer — penting saat frontend & backend beda domain
    # (mis. Vercel + Render), di mana cookie lintas-situs bisa diblokir browser.
    return {"email": email, "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Berhasil keluar"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


def build_confirmation_html(reg: dict) -> str:
    rows = "".join(
        f'<tr><td style="padding:8px 12px;color:#94A3B8;font-size:13px;">{label}</td>'
        f'<td style="padding:8px 12px;color:#F8FAFC;font-size:13px;font-weight:600;">{value}</td></tr>'
        for label, value in [
            ("Nomor Registrasi", reg["reg_number"]),
            ("Nama Atlet", reg["full_name"]),
            ("Perguruan / Kontingen", reg["contingent_school"]),
            ("Kategori", reg["category"]),
            ("Kelompok Usia", reg["age_class"]),
            ("Kelas Tanding", reg.get("weight_class") or "-"),
        ]
    )
    return f"""
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B0E;padding:32px 0;">
      <tr><td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#13131A;border:1px solid #2E2E3A;border-radius:16px;overflow:hidden;font-family:Arial,sans-serif;">
          <tr><td style="background:#800E19;padding:24px;text-align:center;">
            <div style="color:#FACC15;font-size:20px;font-weight:800;letter-spacing:2px;">NUSA WIRAGA 2026</div>
            <div style="color:#F8FAFC;font-size:12px;margin-top:4px;">Kejuaraan Pencak Silat &bull; 10-11 Oktober 2026</div>
          </td></tr>
          <tr><td style="padding:24px;">
            <p style="color:#F8FAFC;font-size:15px;margin:0 0 16px;">Halo <b>{reg['full_name']}</b>, pendaftaran Anda telah kami terima.</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1C1C24;border-radius:12px;">{rows}</table>
            <p style="color:#94A3B8;font-size:13px;margin:16px 0 0;">Simpan nomor registrasi Anda. Panitia akan menghubungi melalui WhatsApp untuk verifikasi pembayaran dan berkas.</p>
          </td></tr>
          <tr><td style="padding:16px;text-align:center;color:#64748B;font-size:11px;border-top:1px solid #2E2E3A;">Panitia Nusa Wiraga &bull; Kaza Mall, Surabaya</td></tr>
        </table>
      </td></tr>
    </table>"""


async def send_confirmation_email(reg: dict):
    if not RESEND_API_KEY:
        logger.info(f"[EMAIL MOCK] Konfirmasi {reg['reg_number']} -> {reg['email']}")
        return
    params = {
        "from": SENDER_EMAIL,
        "to": [reg["email"]],
        "subject": f"Konfirmasi Pendaftaran Nusa Wiraga 2026 - {reg['reg_number']}",
        "html": build_confirmation_html(reg),
    }
    await asyncio.to_thread(resend.Emails.send, params)


@api_router.post("/register")
async def register(body: RegisterInput):
    if "Tanding" in body.category:
        if not body.weight_class:
            raise HTTPException(status_code=422, detail="Kelas tanding wajib dipilih untuk kategori Tanding")
        if not body.height_cm:
            raise HTTPException(status_code=422, detail="Tinggi badan wajib diisi untuk kategori Tanding")
    required_members = 5 if "Berkelompok" in body.category else 2 if "Ganda" in body.category else 0
    if required_members:
        names = [n.strip() for n in (body.member_names or []) if n and n.strip()]
        if len(names) != required_members:
            raise HTTPException(status_code=422, detail=f"Kategori {body.category} wajib diisi tepat {required_members} nama anggota")
        body.member_names = names
    existing_numbers = await db.registrants.distinct("reg_number")
    nums = [int(r.split("-")[1]) for r in existing_numbers if r and r.startswith("NW26-") and r.split("-")[1].isdigit()]
    reg_number = f"NW26-{(max(nums) + 1) if nums else 1:04d}"
    doc = body.model_dump()
    doc.update({
        "id": str(uuid.uuid4()),
        "reg_number": reg_number,
        "status": "menunggu",
        "payment_status": "belum_bayar",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.registrants.insert_one(doc)
    doc.pop("_id", None)
    try:
        if doc.get("email"):
            await send_confirmation_email(doc)
    except Exception as e:
        logger.error(f"Gagal mengirim email konfirmasi: {e}")
    try:
        await append_registration_to_sheet(doc)
    except Exception as e:
        logger.error(f"Gagal sinkron Google Sheets: {e}")
    return {"message": "Pendaftaran berhasil", "reg_number": reg_number, "id": doc["id"]}


@api_router.get("/admin/stats")
async def admin_stats(user: dict = Depends(get_current_user)):
    total = await db.registrants.count_documents({})
    verified = await db.registrants.count_documents({"status": "terverifikasi"})
    pending = await db.registrants.count_documents({"status": "menunggu"})
    unpaid = await db.registrants.count_documents({"payment_status": "belum_bayar"})
    pipeline = [{"$group": {"_id": "$category", "count": {"$sum": 1}}}, {"$sort": {"count": -1}}]
    by_category = [{"category": r["_id"], "count": r["count"]} async for r in db.registrants.aggregate(pipeline)]
    return {"total": total, "verified": verified, "pending": pending, "unpaid": unpaid, "by_category": by_category}


@api_router.get("/admin/registrants")
async def list_registrants(
    user: dict = Depends(get_current_user),
    search: str = "",
    category: str = "",
    status: str = "",
):
    query = {}
    if search:
        query["$or"] = [
            {"full_name": {"$regex": search, "$options": "i"}},
            {"contingent_school": {"$regex": search, "$options": "i"}},
            {"reg_number": {"$regex": search, "$options": "i"}},
        ]
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    rows = await db.registrants.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return rows


@api_router.patch("/admin/registrants/{reg_id}")
async def update_registrant(reg_id: str, body: RegistrantUpdate, user: dict = Depends(get_current_user)):
    update = {}
    if body.status is not None:
        if body.status not in STATUS_VALUES:
            raise HTTPException(status_code=422, detail="Status tidak valid")
        update["status"] = body.status
    if body.payment_status is not None:
        if body.payment_status not in PAYMENT_VALUES:
            raise HTTPException(status_code=422, detail="Status pembayaran tidak valid")
        update["payment_status"] = body.payment_status
    if not update:
        raise HTTPException(status_code=422, detail="Tidak ada perubahan")
    result = await db.registrants.update_one({"id": reg_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    doc = await db.registrants.find_one({"id": reg_id}, {"_id": 0})
    try:
        await update_sheet_row(doc)
    except Exception as e:
        logger.error(f"Gagal sinkron status ke Google Sheets: {e}")
    return doc


@api_router.delete("/admin/registrants/{reg_id}")
async def delete_registrant(reg_id: str, user: dict = Depends(get_current_user)):
    doc = await db.registrants.find_one({"id": reg_id}, {"_id": 0, "reg_number": 1, "files": 1})
    result = await db.registrants.delete_one({"id": reg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    for ref in (doc.get("files") or {}).values():
        if ref and ref.get("file_id"):
            try:
                await delete_object(ref["file_id"])
            except Exception as e:
                logger.error(f"Gagal menghapus berkas GridFS: {e}")
    try:
        await delete_sheet_row(doc["reg_number"])
    except Exception as e:
        logger.error(f"Gagal menghapus baris di Google Sheets: {e}")
    return {"message": "Pendaftar dihapus"}


@api_router.get("/admin/registrants/export/csv")
async def export_csv(user: dict = Depends(get_current_user)):
    rows = await db.registrants.find({}, {"_id": 0}).sort("created_at", 1).to_list(10000)
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["No Registrasi", "Nama", "NIK/NISN", "Email", "WhatsApp", "Perguruan", "Kategori", "Kelompok Usia", "Kelas", "Pelatih", "Status", "Pembayaran", "Tanggal Daftar", "Tinggi Badan (cm)"])
    for r in rows:
        names = ", ".join(r["member_names"]) if r.get("member_names") else r.get("full_name")
        writer.writerow([
            r.get("reg_number"), names, r.get("nik_or_nisn"), r.get("email"),
            r.get("phone_whatsapp"), r.get("contingent_school"), r.get("category"),
            r.get("age_class"), r.get("weight_class") or "-", r.get("official_coach") or "-",
            r.get("status"), r.get("payment_status"), r.get("created_at"), r.get("height_cm") or "-",
        ])
    return StreamingResponse(
        iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=pendaftar-nusa-wiraga-2026.csv"},
    )


EXPORT_HEADERS = [
    "No Registrasi", "Nama", "NIK/NISN", "Email", "WhatsApp", "Perguruan", "Kategori",
    "Kelompok Usia", "Kelas", "Tinggi Badan (cm)", "Pelatih", "Status", "Pembayaran", "Tanggal Daftar",
]
STATUS_LABELS = {"menunggu": "Menunggu", "terverifikasi": "Terverifikasi", "ditolak": "Ditolak"}
PAYMENT_LABELS = {"belum_bayar": "Belum Bayar", "lunas": "Lunas"}


@api_router.get("/admin/registrants/export/xlsx")
async def export_xlsx(user: dict = Depends(get_current_user)):
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
    from openpyxl.utils import get_column_letter
    from openpyxl.worksheet.table import Table, TableStyleInfo

    rows = await db.registrants.find({}, {"_id": 0}).sort("created_at", 1).to_list(10000)

    GOLD = "F5B400"
    MAROON = "800E19"
    INK = "13131A"
    ZEBRA = "F4F4F7"
    BORDER_COLOR = "D8D8E0"

    wb = Workbook()
    ws = wb.active
    ws.title = "Pendaftar"
    n_cols = len(EXPORT_HEADERS)
    last_col_letter = get_column_letter(n_cols)

    # --- Judul & subjudul ---
    ws.merge_cells(f"A1:{last_col_letter}1")
    title_cell = ws["A1"]
    title_cell.value = "DAFTAR PESERTA — KEJUARAAN PENCAK SILAT NUSA WIRAGA 2026"
    title_cell.font = Font(name="Calibri", size=16, bold=True, color="FFFFFF")
    title_cell.fill = PatternFill("solid", fgColor=MAROON)
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30

    ws.merge_cells(f"A2:{last_col_letter}2")
    sub_cell = ws["A2"]
    tz = timezone(timedelta(hours=7))
    sub_cell.value = f"Diunduh {datetime.now(tz).strftime('%d %B %Y, %H:%M')} WIB · Total {len(rows)} pendaftar"
    sub_cell.font = Font(name="Calibri", size=10, italic=True, color=INK)
    sub_cell.fill = PatternFill("solid", fgColor=GOLD)
    sub_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 20

    ws.append([])  # baris kosong pemisah

    # --- Header tabel ---
    header_row_idx = 4
    ws.append(EXPORT_HEADERS)
    thin = Side(style="thin", color=BORDER_COLOR)
    cell_border = Border(left=thin, right=thin, top=thin, bottom=thin)
    for col_idx, _ in enumerate(EXPORT_HEADERS, start=1):
        cell = ws.cell(row=header_row_idx, column=col_idx)
        cell.font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        cell.fill = PatternFill("solid", fgColor=INK)
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = cell_border
    ws.row_dimensions[header_row_idx].height = 26

    # --- Baris data ---
    status_fill = {
        "terverifikasi": PatternFill("solid", fgColor="D6F3DD"),
        "menunggu": PatternFill("solid", fgColor="FDF1D2"),
        "ditolak": PatternFill("solid", fgColor="FADADA"),
    }
    payment_fill = {
        "lunas": PatternFill("solid", fgColor="D6F3DD"),
        "belum_bayar": PatternFill("solid", fgColor="FADADA"),
    }
    status_font = {
        "terverifikasi": Font(color="1E7A3B", bold=True),
        "menunggu": Font(color="9A6B00", bold=True),
        "ditolak": Font(color="B3261E", bold=True),
    }
    payment_font = {
        "lunas": Font(color="1E7A3B", bold=True),
        "belum_bayar": Font(color="B3261E", bold=True),
    }

    for i, r in enumerate(rows):
        names = ", ".join(r["member_names"]) if r.get("member_names") else r.get("full_name")
        status = r.get("status", "")
        payment = r.get("payment_status", "")
        row_values = [
            r.get("reg_number"), names, r.get("nik_or_nisn") or "-", r.get("email") or "-",
            r.get("phone_whatsapp") or "-", r.get("contingent_school"), r.get("category"),
            r.get("age_class"), r.get("weight_class") or "-", r.get("height_cm") or "-",
            r.get("official_coach") or "-", STATUS_LABELS.get(status, status),
            PAYMENT_LABELS.get(payment, payment), r.get("created_at") or "-",
        ]
        row_idx = header_row_idx + 1 + i
        ws.append(row_values)
        zebra_fill = PatternFill("solid", fgColor=ZEBRA) if i % 2 == 1 else None
        for col_idx in range(1, n_cols + 1):
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.border = cell_border
            cell.font = Font(name="Calibri", size=10)
            cell.alignment = Alignment(vertical="center", wrap_text=col_idx == 2)
            if zebra_fill:
                cell.fill = zebra_fill
        status_col = EXPORT_HEADERS.index("Status") + 1
        payment_col = EXPORT_HEADERS.index("Pembayaran") + 1
        status_cell = ws.cell(row=row_idx, column=status_col)
        status_cell.alignment = Alignment(horizontal="center", vertical="center")
        if status in status_fill:
            status_cell.fill = status_fill[status]
            status_cell.font = status_font[status]
        payment_cell = ws.cell(row=row_idx, column=payment_col)
        payment_cell.alignment = Alignment(horizontal="center", vertical="center")
        if payment in payment_fill:
            payment_cell.fill = payment_fill[payment]
            payment_cell.font = payment_font[payment]

    # --- Lebar kolom otomatis (dibatasi agar tidak berlebihan) ---
    widths = [16, 26, 16, 26, 16, 22, 14, 14, 10, 10, 18, 15, 14, 20]
    for col_idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(col_idx)].width = width

    ws.freeze_panes = f"A{header_row_idx + 1}"

    last_row = header_row_idx + len(rows)
    if rows:
        table = Table(displayName="TabelPendaftar", ref=f"A{header_row_idx}:{last_col_letter}{last_row}")
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleLight1", showFirstColumn=False, showLastColumn=False,
            showRowStripes=False, showColumnStripes=False,
        )
        ws.add_table(table)

    ws.sheet_view.showGridLines = False

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=pendaftar-nusa-wiraga-2026.xlsx"},
    )


# ---------- Upload Berkas Pendaftar ----------
@api_router.post("/register/{reg_id}/files")
async def upload_registration_files(
    reg_id: str,
    data_diri: Optional[UploadFile] = File(None),
    surat_sehat: Optional[UploadFile] = File(None),
    foto: Optional[UploadFile] = File(None),
):
    reg = await db.registrants.find_one({"id": reg_id})
    if not reg:
        raise HTTPException(status_code=404, detail="Pendaftar tidak ditemukan")
    existing = reg.get("files", {})
    uploads = {}
    for kind, file in (("data_diri", data_diri), ("surat_sehat", surat_sehat), ("foto", foto)):
        if not file or not file.filename:
            continue
        ext = file.filename.rsplit(".", 1)[-1].lower()
        if ext not in FILE_KINDS[kind]:
            raise HTTPException(status_code=422, detail=f"Format {kind} tidak didukung (PDF/JPG/PNG)")
        data = await file.read()
        if len(data) > 5 * 1024 * 1024:
            raise HTTPException(status_code=422, detail=f"Ukuran {kind} maksimal 5 MB")
        file_id = await put_object(
            f"{reg_id}/{kind}.{ext}", data,
            file.content_type or "application/octet-stream",
            {"reg_id": reg_id, "kind": kind},
        )
        # Ganti berkas lama (kalau ada) supaya tidak menumpuk di GridFS
        old = existing.get(kind)
        if old and old.get("file_id"):
            await delete_object(old["file_id"])
        uploads[kind] = {"file_id": file_id, "filename": file.filename}
    if uploads:
        await db.registrants.update_one({"id": reg_id}, {"$set": {f"files.{k}": v for k, v in uploads.items()}})
        updated = await db.registrants.find_one({"id": reg_id}, {"_id": 0})
        try:
            await update_sheet_row(updated)
        except Exception as e:
            logger.error(f"Gagal sinkron link berkas ke Google Sheets: {e}")
    return {"message": "Berkas terunggah", "files": list(uploads.keys())}


@api_router.get("/admin/files/{reg_id}/{kind}")
async def admin_download_file(reg_id: str, kind: str, user: dict = Depends(get_current_user)):
    if kind not in FILE_KINDS:
        raise HTTPException(status_code=404, detail="Berkas tidak ditemukan")
    reg = await db.registrants.find_one({"id": reg_id}, {"_id": 0})
    ref = (reg or {}).get("files", {}).get(kind)
    if not ref or not ref.get("file_id"):
        raise HTTPException(status_code=404, detail="Berkas tidak ditemukan")
    data, content_type = await get_object(ref["file_id"])
    filename = ref.get("filename") or f"{kind}"
    return Response(
        content=data, media_type=content_type,
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# Endpoint tanpa login khusus dipakai oleh link HYPERLINK() di Google Sheets
# (Sheets tidak bisa mengirim cookie/token admin). Keamanannya bertumpu pada
# reg_id berupa UUID acak (sama seperti pola foto galeri publik) — siapapun
# yang punya link bisa membukanya, jadi jangan sebarkan link sheet ke publik.
@api_router.get("/files/{reg_id}/{kind}/public")
async def public_registration_file(reg_id: str, kind: str):
    if kind not in FILE_KINDS:
        raise HTTPException(status_code=404, detail="Berkas tidak ditemukan")
    reg = await db.registrants.find_one({"id": reg_id}, {"_id": 0, "files": 1})
    ref = (reg or {}).get("files", {}).get(kind)
    if not ref or not ref.get("file_id"):
        raise HTTPException(status_code=404, detail="Berkas tidak ditemukan")
    data, content_type = await get_object(ref["file_id"])
    return Response(content=data, media_type=content_type, headers={"Cache-Control": "private, max-age=3600"})


# ---------- Konten Publik ----------
@api_router.get("/news")
async def public_news():
    return await db.news.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/results")
async def public_results():
    return await db.results.find({}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.get("/sponsors")
async def public_sponsors():
    return await db.sponsors.find({}, {"_id": 0}).sort("created_at", 1).to_list(200)


# ---------- Admin CMS: Berita ----------
@api_router.post("/admin/news")
async def create_news(body: NewsInput, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.news.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/news/{news_id}")
async def update_news(news_id: str, body: NewsInput, user: dict = Depends(get_current_user)):
    result = await db.news.update_one({"id": news_id}, {"$set": body.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    return await db.news.find_one({"id": news_id}, {"_id": 0})


@api_router.delete("/admin/news/{news_id}")
async def delete_news(news_id: str, user: dict = Depends(get_current_user)):
    result = await db.news.delete_one({"id": news_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Berita tidak ditemukan")
    return {"message": "Berita dihapus"}


# ---------- Admin CMS: Hasil & Juara ----------
@api_router.post("/admin/results")
async def create_result(body: ResultInput, user: dict = Depends(get_current_user)):
    if body.medal not in MEDAL_VALUES:
        raise HTTPException(status_code=422, detail="Medali tidak valid (emas/perak/perunggu)")
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.results.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/results/{result_id}")
async def update_result(result_id: str, body: ResultInput, user: dict = Depends(get_current_user)):
    if body.medal not in MEDAL_VALUES:
        raise HTTPException(status_code=422, detail="Medali tidak valid")
    result = await db.results.update_one({"id": result_id}, {"$set": body.model_dump()})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Data juara tidak ditemukan")
    return await db.results.find_one({"id": result_id}, {"_id": 0})


@api_router.delete("/admin/results/{result_id}")
async def delete_result(result_id: str, user: dict = Depends(get_current_user)):
    result = await db.results.delete_one({"id": result_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data juara tidak ditemukan")
    return {"message": "Data juara dihapus"}


# ---------- Admin CMS: Sponsor ----------
@api_router.post("/admin/sponsors")
async def create_sponsor(body: SponsorInput, user: dict = Depends(get_current_user)):
    if body.tier not in TIER_VALUES:
        raise HTTPException(status_code=422, detail="Tier sponsor tidak valid")
    if not body.logo_data.startswith("data:image/") or len(body.logo_data) > 700_000:
        raise HTTPException(status_code=422, detail="Logo harus gambar dengan ukuran di bawah 500 KB")
    doc = body.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.sponsors.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.delete("/admin/sponsors/{sponsor_id}")
async def delete_sponsor(sponsor_id: str, user: dict = Depends(get_current_user)):
    result = await db.sponsors.delete_one({"id": sponsor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sponsor tidak ditemukan")
    return {"message": "Sponsor dihapus"}


# ---------- Galeri (foto disimpan di GridFS, disajikan lewat endpoint publik) ----------
GALLERY_EXT = {"jpg", "jpeg", "png", "webp"}


@api_router.get("/gallery")
async def public_gallery():
    return await db.gallery.find({}, {"_id": 0, "file_id": 0}).sort("created_at", 1).to_list(200)


@api_router.get("/gallery/{item_id}/image")
async def gallery_image(item_id: str):
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item or not item.get("file_id"):
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")
    data, content_type = await get_object(item["file_id"])
    return Response(content=data, media_type=content_type, headers={"Cache-Control": "public, max-age=86400"})


@api_router.post("/admin/gallery")
async def create_gallery_item(
    user: dict = Depends(get_current_user),
    image: UploadFile = File(...),
    caption: str = Form(""),
):
    ext = (image.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in GALLERY_EXT:
        raise HTTPException(status_code=422, detail="Format gambar tidak didukung (JPG/PNG/WEBP)")
    data = await image.read()
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Ukuran gambar maksimal 5 MB")
    item_id = str(uuid.uuid4())
    file_id = await put_object(
        f"gallery/{item_id}.{ext}", data,
        image.content_type or "image/jpeg", {"item_id": item_id, "kind": "gallery"},
    )
    doc = {
        "id": item_id, "file_id": file_id,
        "caption": (caption or "").strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.gallery.insert_one(doc)
    return {"id": item_id, "caption": doc["caption"], "created_at": doc["created_at"]}


@api_router.delete("/admin/gallery/{item_id}")
async def delete_gallery_item(item_id: str, user: dict = Depends(get_current_user)):
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Gambar tidak ditemukan")
    await db.gallery.delete_one({"id": item_id})
    if item.get("file_id"):
        try:
            await delete_object(item["file_id"])
        except Exception as e:
            logger.error(f"Gagal menghapus gambar galeri di GridFS: {e}")
    return {"message": "Gambar galeri dihapus"}


# ---------- Bagan Pertandingan ----------
def _validate_bracket(body: BracketInput):
    if body.kind not in BRACKET_KINDS:
        raise HTTPException(status_code=422, detail="Jenis bagan tidak valid")
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Judul bagan wajib diisi")
    if body.kind == "bracket" and body.size not in BRACKET_SIZES:
        raise HTTPException(status_code=422, detail="Ukuran bagan harus 2, 3, 4, 8, 16, atau 32")


def _normalize_matches(matches: List[MatchInput]) -> list:
    out = []
    for m in matches:
        d = m.model_dump()
        d["id"] = d.get("id") or str(uuid.uuid4())
        if d.get("winner") not in (1, 2, None):
            d["winner"] = None
        out.append(d)
    return out


@api_router.get("/brackets")
async def public_brackets():
    return await db.brackets.find({}, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).to_list(200)


@api_router.post("/admin/brackets")
async def create_bracket(body: BracketInput, user: dict = Depends(get_current_user)):
    _validate_bracket(body)
    doc = {
        "id": str(uuid.uuid4()),
        "title": body.title.strip(),
        "kind": body.kind,
        "size": body.size,
        "matches": _normalize_matches(body.matches),
        "order": body.order,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.brackets.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/brackets/{bracket_id}")
async def update_bracket(bracket_id: str, body: BracketInput, user: dict = Depends(get_current_user)):
    _validate_bracket(body)
    update = {
        "title": body.title.strip(),
        "kind": body.kind,
        "size": body.size,
        "matches": _normalize_matches(body.matches),
        "order": body.order,
    }
    result = await db.brackets.update_one({"id": bracket_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bagan tidak ditemukan")
    return await db.brackets.find_one({"id": bracket_id}, {"_id": 0})


@api_router.delete("/admin/brackets/{bracket_id}")
async def delete_bracket(bracket_id: str, user: dict = Depends(get_current_user)):
    result = await db.brackets.delete_one({"id": bracket_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bagan tidak ditemukan")
    return {"message": "Bagan dihapus"}


SHEET_HEADER = [
    "No Registrasi", "Nama", "NIK/NISN", "Email", "WhatsApp", "Perguruan", "Kategori", "Kelompok Usia",
    "Kelas", "Pelatih", "Status", "Pembayaran", "Tanggal Daftar", "Tinggi Badan (cm)",
    "Foto", "KTP/NISN", "Surat Sehat",
]
SHEET_COL_LETTERS = "ABCDEFGHIJKLMNOPQ"  # 17 kolom, selaras dengan SHEET_HEADER

# Berkas pendaftar disimpan di MongoDB via GridFS. Pilihan ini bekerja sama
# di lokal maupun di Vercel (yang filesystem-nya ephemeral), ikut bersama
# database, dan tidak butuh layanan/kunci storage pihak ketiga.
fs_bucket = AsyncIOMotorGridFSBucket(db, bucket_name="uploads")


async def put_object(filename: str, data: bytes, content_type: str, metadata: dict) -> str:
    """Simpan bytes ke GridFS, kembalikan id file (string)."""
    meta = {"content_type": content_type, **metadata}
    file_id = await fs_bucket.upload_from_stream(filename, data, metadata=meta)
    return str(file_id)


async def get_object(file_id: str):
    """Ambil bytes + content-type dari GridFS berdasarkan id file."""
    from bson import ObjectId
    stream = await fs_bucket.open_download_stream(ObjectId(file_id))
    data = await stream.read()
    content_type = (stream.metadata or {}).get("content_type", "application/octet-stream")
    return data, content_type


async def delete_object(file_id: str):
    """Hapus file dari GridFS; abaikan kalau sudah tidak ada."""
    from bson import ObjectId
    from gridfs.errors import NoFile
    try:
        await fs_bucket.delete(ObjectId(file_id))
    except NoFile:
        pass


FILE_KINDS = {
    "data_diri": {"pdf", "jpg", "jpeg", "png"},
    "surat_sehat": {"pdf", "jpg", "jpeg", "png"},
    "foto": {"jpg", "jpeg", "png"},
}


def file_link_formula(reg_id: str, doc: dict, kind: str, label: str) -> str:
    """Formula =HYPERLINK() ke berkas pendaftar (foto/KTP/surat sehat), kosong bila belum diunggah."""
    ref = (doc.get("files") or {}).get(kind)
    if not ref or not ref.get("file_id"):
        return ""
    backend_url = os.environ.get("BACKEND_URL", "http://localhost:8000").rstrip("/")
    url = f"{backend_url}/api/files/{reg_id}/{kind}/public"
    return f'=HYPERLINK("{url}"; "{label}")'


def build_sheet_row(doc: dict) -> list:
    names = ", ".join(doc["member_names"]) if doc.get("member_names") else doc.get("full_name")
    reg_id = doc.get("id", "")
    return [
        doc.get("reg_number"), names, doc.get("nik_or_nisn") or "", doc.get("email") or "",
        doc.get("phone_whatsapp") or "", doc.get("contingent_school"), doc.get("category"),
        doc.get("age_class"), doc.get("weight_class") or "-", doc.get("official_coach") or "-",
        doc.get("status"), doc.get("payment_status"), doc.get("created_at"),
        doc.get("height_cm") or "-",
        file_link_formula(reg_id, doc, "foto", "Lihat Foto"),
        file_link_formula(reg_id, doc, "data_diri", "Lihat KTP/NISN"),
        file_link_formula(reg_id, doc, "surat_sehat", "Lihat Surat Sehat"),
    ]


def get_sheets_service():
    raw = os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON", "")
    sheet_id = os.environ.get("GOOGLE_SPREADSHEET_ID", "")
    if not raw or not sheet_id:
        return None, None
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    import base64
    info = json.loads(base64.b64decode(raw).decode())
    creds = service_account.Credentials.from_service_account_info(
        info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
    )
    return build("sheets", "v4", credentials=creds), sheet_id


async def append_registration_to_sheet(doc: dict):
    service, sheet_id = get_sheets_service()
    if not service:
        logger.info(f"[SHEETS NONAKTIF] {doc['reg_number']} tidak disinkron (kredensial belum diisi)")
        return
    row = build_sheet_row(doc)
    last_col = SHEET_COL_LETTERS[len(SHEET_HEADER) - 1]

    def _append():
        meta = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        title = meta["sheets"][0]["properties"]["title"]
        existing = service.spreadsheets().values().get(
            spreadsheetId=sheet_id, range=f"'{title}'!A1:{last_col}1"
        ).execute().get("values", [])
        if existing and len(existing[0]) < len(SHEET_HEADER):
            missing = SHEET_HEADER[len(existing[0]):]
            start_col = SHEET_COL_LETTERS[len(existing[0])]
            service.spreadsheets().values().update(
                spreadsheetId=sheet_id, range=f"'{title}'!{start_col}1",
                valueInputOption="RAW", body={"values": [missing]},
            ).execute()
        values = [row] if existing else [SHEET_HEADER, row]
        service.spreadsheets().values().append(
            spreadsheetId=sheet_id, range=f"'{title}'!A1",
            valueInputOption="USER_ENTERED", body={"values": values},
        ).execute()

    await asyncio.to_thread(_append)


async def update_sheet_row(doc: dict):
    service, sheet_id = get_sheets_service()
    if not service:
        return

    def _update():
        meta = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        title = meta["sheets"][0]["properties"]["title"]
        col = service.spreadsheets().values().get(
            spreadsheetId=sheet_id, range=f"'{title}'!A:A"
        ).execute().get("values", [])
        row_idx = next((i + 1 for i, r in enumerate(col) if r and r[0] == doc["reg_number"]), None)
        if not row_idx:
            logger.info(f"[SHEETS] Baris {doc['reg_number']} tidak ditemukan, ditambahkan sebagai baris baru")
            service.spreadsheets().values().append(
                spreadsheetId=sheet_id, range=f"'{title}'!A1",
                valueInputOption="USER_ENTERED", body={"values": [build_sheet_row(doc)]},
            ).execute()
            return
        # Perbarui status, pembayaran, tinggi badan, dan link berkas sekaligus
        # (dipanggil baik saat admin ubah status maupun saat berkas baru diunggah).
        last_col = SHEET_COL_LETTERS[len(SHEET_HEADER) - 1]
        row = build_sheet_row(doc)
        service.spreadsheets().values().update(
            spreadsheetId=sheet_id, range=f"'{title}'!K{row_idx}:{last_col}{row_idx}",
            valueInputOption="USER_ENTERED",
            body={"values": [row[10:]]},
        ).execute()

    await asyncio.to_thread(_update)


async def delete_sheet_row(reg_number: str):
    service, sheet_id = get_sheets_service()
    if not service:
        return

    def _delete():
        meta = service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        sheet = meta["sheets"][0]["properties"]
        col = service.spreadsheets().values().get(
            spreadsheetId=sheet_id, range=f"'{sheet['title']}'!A:A"
        ).execute().get("values", [])
        row_idx = next((i for i, r in enumerate(col) if r and r[0] == reg_number), None)
        if row_idx is None:
            logger.info(f"[SHEETS] Baris {reg_number} tidak ditemukan untuk dihapus")
            return
        service.spreadsheets().batchUpdate(
            spreadsheetId=sheet_id,
            body={"requests": [{"deleteDimension": {"range": {
                "sheetId": sheet["sheetId"], "dimension": "ROWS",
                "startIndex": row_idx, "endIndex": row_idx + 1,
            }}}]},
        ).execute()

    await asyncio.to_thread(_delete)


@api_router.get("/admin/sheets/status")
async def sheets_status(user: dict = Depends(get_current_user)):
    service, sheet_id = get_sheets_service()
    if not service:
        return {"configured": False, "connected": False}
    try:
        meta = await asyncio.to_thread(
            lambda: service.spreadsheets().get(spreadsheetId=sheet_id).execute()
        )
        return {"configured": True, "connected": True, "sheet_title": meta.get("properties", {}).get("title")}
    except Exception as e:
        logger.error(f"Cek status Sheets gagal: {e}")
        return {"configured": True, "connected": False}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:3000"), "http://localhost:3000"],
    # Vercel juga menyajikan situs ini lewat domain alias & preview
    # (mis. web-nusa-wiraga-teal.vercel.app), yang harus ikut diizinkan.
    allow_origin_regex=r"https://(nusawiraga|web-nusa-wiraga)[a-z0-9\-]*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def seed_admin():
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing is None:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin Nusa Wiraga",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Admin dibuat: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logger.info("Kata sandi admin diperbarui dari .env")


SEED_NEWS = [
    {"title": "Jadwal Technical Meeting & Pengundian Bagan Pertandingan", "date": "05 Oktober 2026", "badge": "Penting",
     "body": "Seluruh manajer kontingen wajib hadir dalam technical meeting dan pengundian bagan pertandingan di Kaza Mall Surabaya pukul 09.00 WIB."},
    {"title": "Panduan Standar Perlengkapan Body Protector & Deker Sesuai Regulasi IPSI 2026", "date": "28 September 2026", "badge": "Regulasi",
     "body": "Seluruh atlet kategori Tanding wajib menggunakan body protector dan deker standar IPSI. Pemeriksaan perlengkapan dilakukan saat penimbangan badan."},
    {"title": "Daftar 64 Perguruan Silat yang Telah Mengonfirmasi Kontingen", "date": "20 September 2026", "badge": "Kontingen",
     "body": "Sebanyak 64 perguruan dari 21 provinsi telah mengonfirmasi keikutsertaan. Kuota kontingen tersisa terbatas, segera daftarkan atlet terbaik Anda."},
]


async def seed_news():
    if await db.news.count_documents({}) == 0:
        now = datetime.now(timezone.utc).isoformat()
        await db.news.insert_many([
            {**n, "id": str(uuid.uuid4()), "created_at": now} for n in SEED_NEWS
        ])
        logger.info("Berita awal dimuat")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.registrants.create_index("reg_number", unique=True)
    await seed_admin()
    await seed_news()
    # Berkas disimpan di GridFS (MongoDB) — tidak ada init storage eksternal lagi.


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
