# Panduan Deploy — Nusa Wiraga 2026

Arsitektur yang **berjalan sekarang**: **Frontend (React) → Vercel** (otomatis dari
`git push` ke `main`) + **Backend (FastAPI) → shared hosting cPanel Arenhost**
(`https://nusawiraga.my.id`, diunggah manual) + **MongoDB Atlas**.

> Bagian 1 di bawah adalah rencana lama (Render) yang **tidak dipakai**. Yang
> berlaku untuk backend: lihat bagian 5.

Nilai env var ada di `backend/.env` (tidak ikut ke git). Siapkan file itu saat mengisi dashboard.

---

## 1) Backend ke Render (rencana lama, tidak dipakai)

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

---

## 5) Backend di cPanel Arenhost (cara yang dipakai)

Backend berjalan sebagai aplikasi Python (LiteSpeed/Passenger) di
`https://nusawiraga.my.id`, dan **tidak** ikut ter-deploy lewat `git push`.
Setiap perubahan backend harus diunggah manual.

### 5.1 Bikin paket

Dari folder `backend/`:

```bash
python build_deploy_zip.py     # menghasilkan backend_upload_uji.zip
```

Paket berisi `server.py`, `uji.py`, `requirements.txt`, `passenger_wsgi.py`, `runtime.txt`.
Skrip menolak jalan kalau anchor kode tidak ketemu atau ada syntax error.

### 5.2 Unggah

1. cPanel → **File Manager** → masuk ke folder aplikasi Python (tempat
   `server.py` dan `passenger_wsgi.py` berada).
2. **Backup dulu**: centang `server.py` → *Download* (atau *Rename* jadi
   `server.py.bak-<tanggal>`). Ini jalan balik kalau ada masalah.
3. *Upload* `backend_upload_uji.zip` → klik kanan → **Extract** → timpa
   (`Overwrite`) `server.py`, tambahkan `uji.py`.
4. cPanel → **Setup Python App** → pilih aplikasi → **Restart**.

### 5.3 Verifikasi

- `https://nusawiraga.my.id/api/uji/public/rekap` → harus `200` dengan
  `{"atlet": [...], "diperbarui": "..."}`.
- `https://nusawiraga.my.id/api/uji/state` tanpa token → harus `401`.
- Kalau dua-duanya benar, buka `https://nusawiraga.vercel.app/kebugaran`,
  klik **Masuk panitia**, lalu masuk dengan akun admin yang sudah ada.

### 5.4 Endpoint `/api/uji/*` (butuh token admin/pelatih kecuali yang publik)

| Metode | Path | Keterangan |
|---|---|---|
| GET | `/api/uji/state` | Seluruh atlet + norma kustom (staf) |
| PUT | `/api/uji/atlet/{id}` | Simpan/ubah satu atlet beserta `sesiTes` (staf) |
| DELETE | `/api/uji/atlet/{id}` | Hapus atlet (staf) |
| PUT | `/api/uji/norma` | Simpan item tes & norma kustom (**admin**) |
| GET | `/api/uji/public/rekap` | Rekap publik, tanpa tanggal lahir (tanpa login) |
| GET/POST/PATCH/DELETE | `/api/uji/users[...]` | Kelola akun panitia & pelatih (**admin**) |

Akun memakai koleksi `users` yang sama dengan login admin situs; field `role`
bernilai `admin` atau `pelatih`. Data tes masuk ke koleksi `uji_atlet` dan
`uji_norma`. Untuk membuat akun pelatih pertama: masuk sebagai admin di
`/kebugaran` → tab **Pengaturan Admin** → kartu **Akun Panitia & Pelatih**.

### 5.5 Uji lokal tanpa MongoDB

```bash
cd backend
pip install fastapi httpx mongomock-motor
python test_uji_api.py    # 23 pemeriksaan: peran, validasi, rekap publik, akun
```
