# Panduan Deploy — Nusa Wiraga 2026

Arsitektur: **Frontend (React) → Vercel** + **Backend (FastAPI) → Render**, database **MongoDB Atlas** (sudah ada).

Nilai env var ada di `backend/.env` (tidak ikut ke git). Siapkan file itu saat mengisi dashboard.

---

## 1) Backend ke Render

1. Buat akun di https://render.com (login pakai GitHub).
2. **New +** → **Blueprint** → pilih repo `Web-NusaWiraga`. Render membaca `render.yaml` otomatis (root `backend`, start `uvicorn server:app`).
3. Isi **Environment Variables** (ambil dari `backend/.env`):
   - `MONGO_URL` — connection string MongoDB Atlas
   - `DB_NAME`
   - `JWT_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `FRONTEND_URL` — sementara kosongkan (diisi setelah Vercel jadi, langkah 3)
   - Opsional: `RESEND_API_KEY`, `SENDER_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_SPREADSHEET_ID`
4. Deploy. Catat URL backend, mis. `https://nusawiraga-backend.onrender.com`.
5. **MongoDB Atlas** → Network Access → izinkan `0.0.0.0/0` (agar Render bisa konek).

> Catatan: plan Free Render "tidur" setelah ~15 menit tanpa akses; request pertama bisa lambat ~50 detik (cold start). Wajar untuk testing.

## 2) Frontend ke Vercel

1. Buat akun di https://vercel.com (login pakai GitHub).
2. **Add New → Project** → import repo `Web-NusaWiraga`.
3. **Root Directory** = `frontend` (penting). Framework otomatis terdeteksi *Create React App*.
4. **Environment Variables**:
   - `REACT_APP_BACKEND_URL` = URL backend Render dari langkah 1.4 (tanpa `/` di akhir, tanpa `/api`). Contoh: `https://nusawiraga-backend.onrender.com`
5. Deploy. Catat URL frontend, mis. `https://nusawiraga.vercel.app`.

## 3) Sambungkan keduanya (CORS)

1. Kembali ke Render → env var **`FRONTEND_URL`** = URL Vercel dari langkah 2.5 (persis, pakai `https://`, tanpa `/` di akhir).
2. Render akan redeploy. Ini agar backend mengizinkan request dari domain frontend (CORS).

## 4) Uji

- Buka URL Vercel → coba daftar atlet + unggah berkas.
- `/admin/login` → masuk pakai `ADMIN_EMAIL` / `ADMIN_PASSWORD`. (Login lintas-domain sudah dibuat aman lewat token, bukan cuma cookie.)

---

## Ringkas env var

| Variabel | Di mana | Contoh / sumber |
|---|---|---|
| `MONGO_URL` | Render | dari `backend/.env` (Atlas) |
| `DB_NAME` | Render | dari `backend/.env` |
| `JWT_SECRET` | Render | dari `backend/.env` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Render | dari `backend/.env` |
| `FRONTEND_URL` | Render | URL Vercel (langkah 3) |
| `BACKEND_URL` | Render | URL backend itu sendiri, mis. `https://nusawiraga.my.id` — dipakai untuk link berkas di Google Sheets; kalau kosong, link-nya mengarah ke `localhost` dan tidak bisa dibuka siapa pun |
| `REACT_APP_BACKEND_URL` | Vercel | URL Render (langkah 2.4) |

Kalau nanti mau pakai domain sendiri, arahkan domain ke Vercel (frontend) dan subdomain mis. `api.` ke Render (backend), lalu perbarui kedua URL di atas.
