# PRD — Website Nusa Wiraga (Kejuaraan Pencak Silat Nasional)

## Problem Statement (asli)
"saya ingin membuat website untuk pendaftaran lomba silat \"Nusa Wiraga\". dan bisa untuk company profile juga setelah kita melaksanakannya. karena event ini hanya 1x dalam setahun dan hanya 1 minggu"

## Keputusan Pengguna
1. Form pendaftaran online lengkap + dashboard admin + tombol WhatsApp panitia
2. Company profile lengkap: profil, galeri, berita, hasil pertandingan, sponsor
3. Tanpa login peserta; login khusus admin saja (ditambahkan untuk melindungi dashboard)
4. Warna: merah maroon & kuning (emas)
5. Notifikasi email otomatis setelah pendaftaran (Resend)

## Arsitektur
- Frontend: React (CRA/craco) + Tailwind + shadcn/ui + framer-motion + sonner
- Backend: FastAPI + Motor (MongoDB async), cookie JWT httpOnly (12 jam), bcrypt
- Database: MongoDB (koleksi: users, registrants, login_attempts)
- Email: Resend (asyncio.to_thread, fallback log bila key kosong)

## Persona
- Peserta/perguruan: mendaftar tanpa akun, dapat nomor registrasi NW26-XXXX
- Panitia/admin: mengelola & memverifikasi pendaftar di /admin
- Publik/sponsor: membaca profil event, berita, galeri, peluang sponsorship

## Yang Sudah Diimplementasikan (2026-09-01)
- Landing page lengkap: Hero (countdown ke 12 Okt 2026, statistik), Profil & Visi, Kategori & Biaya, Hasil Pertandingan (placeholder gelanggang A/B/C), Berita, Galeri bento, Sponsor 3 tier, Footer, widget WhatsApp melayang
- Halaman /daftar: form ringkas (nama, kontingen/asal sekolah, kategori, kelompok usia, kelas tanding kondisional, pelatih) — kolom NIK/email/WhatsApp dihapus atas permintaan user (2026-09-01); modal sukses dengan nomor registrasi + tombol WA. Kategori "Seni Regu (TGR)" diganti "Berkelompok (Jurus Baku)" (2026-09-01) — memilihnya menampilkan 5 kolom nama anggota wajib, Seni Ganda 2 nama (divalidasi backend, tersimpan sebagai member_names; kolom Nama di Sheets/CSV berisi nama digabung). Kelompok usia hanya: Usia Dini (7-11) & Pra Remaja (12-14) — Remaja/Dewasa dihapus (2026-09-01). Kategori Tanding wajib isi tinggi badan (cm) — tampil di admin, CSV, dan kolom N spreadsheet (2026-09-01). Email konfirmasi kini tidak terkirim karena peserta tidak mengisi email (fitur Resend standby bila kolom email dikembalikan)
- Backend: POST /api/register, auth admin (login/logout/me, proteksi brute-force 5x/15 mnt), admin stats, list (search+filter), PATCH status/pembayaran, DELETE, export CSV
- Admin dashboard /admin: kartu statistik, badge per kategori, tabel dengan filter/pencarian, ubah status & pembayaran, hapus, WA atlet, export CSV
- SEO: komponen Seo, canonical/og dinamis, JSON-LD SportsEvent, llms.txt
- Seed admin idempoten: admin@nusawiraga.id / NusaWiraga2026!
- (2026-09-01) Email konfirmasi Resend AKTIF (pengirim onboarding@resend.dev; mode uji = hanya ke email pemilik akun Resend)
- (2026-09-01) CMS Admin: tab Berita (tulis/ubah/hapus, 3 berita awal ter-seed), tab Hasil & Juara (input juara emas/perak/perunggu per kategori/divisi), tab Sponsor (upload logo maks 500KB base64, 3 tier). Beranda publik otomatis menampilkan data CMS: berita dari DB, papan juara menggantikan placeholder gelanggang saat ada data, logo sponsor menggantikan slot placeholder

- (2026-09-01) Upload berkas pendaftar via Emergent Object Storage: 3 berkas opsional di form (data diri PDF/JPG/PNG, surat sehat PDF/JPG/PNG, pas foto JPG/PNG, maks 5MB), diunggah setelah registrasi ke POST /api/register/{id}/files; referensi tersimpan di doc registrant (files.data_diri/surat_sehat/foto); admin membuka berkas via GET /api/admin/files/{id}/{kind} (terproteksi login, ikon per baris di tabel)
- (2026-09-01) Integrasi Google Sheets AKTIF dua arah + hapus: pendaftar baru otomatis di-append; perubahan status verifikasi/lunas memperbarui kolom Status & Pembayaran di baris yang sama; penghapusan pendaftar di admin ikut menghapus barisnya di spreadsheet (deleteDimension by reg_number). Nomor registrasi memakai max+1 (tahan terhadap penghapusan data). CATATAN: ada 2 baris duplikat NW26-0009 di sheet dari uji coba user sebelum perbaikan penomoran — perlu dibersihkan manual oleh user bila mengganggu

## Backlog Prioritas
### P0
- ~~Nomor WA panitia~~ SELESAI (2026-09-01): Nayla 085100476404 & Alfian 083848956603 terpasang di hero, widget melayang, footer, modal sukses, CTA sponsor
- ~~Berkas wajib~~ SELESAI (2026-09-01): 3 berkas wajib diisi sebelum pendaftaran terkirim (validasi di form)
- Verifikasi domain di Resend agar email sampai ke semua pendaftar (bila kolom email dikembalikan)

### P1
- Bagan pertandingan (bracket) visual per kelas
- Upload logo sponsor ke object storage (saat ini base64 di MongoDB, cukup untuk logo kecil)
- Bukti pembayaran upload oleh peserta (object storage)

### P2
- Pembayaran online (payment gateway)
- Halaman arsip juara edisi sebelumnya
- Ekspor PDF kartu peserta/nomor undian

## Next Tasks
1. Minta nomor WA panitia asli + alamat sekretariat + tanggal & venue final
2. Integrasi Google Sheets (menunggu kredensial user)
3. Bracket/bagan pertandingan visual
