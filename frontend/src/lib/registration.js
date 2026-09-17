// Aturan keanggotaan kategori, dipakai formulir pendaftaran dan dasbor admin.
// Kembarannya ada di backend (member_count/photo_kinds_for di server.py) —
// ubah keduanya bila daftar kategori berubah.

export const MAX_MEMBERS = 5;

// Kind pertama tetap bernama "foto" (bukan "foto_1") supaya berkas pendaftar
// lama, link di Google Sheets, dan tombol admin yang sudah ada tetap jalan.
export const PHOTO_KINDS = ["foto", "foto_2", "foto_3", "foto_4", "foto_5"];

// Jumlah nama anggota yang wajib diisi kategori ini (0 = atlet tunggal).
export const memberCount = (category = "") =>
  category.includes("Berkelompok") ? MAX_MEMBERS : category.includes("Ganda") ? 2 : 0;

// Kategori beregu wajib satu pas foto per anggota; tunggal tetap satu foto.
export const photoKindsFor = (category = "") =>
  PHOTO_KINDS.slice(0, Math.max(memberCount(category), 1));

export const photoLabel = (index, total) =>
  (total > 1 ? `Pas Foto Anggota ${index + 1}` : "Pas Foto");
