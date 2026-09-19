// Aturan keanggotaan & berkas per kategori, dipakai formulir pendaftaran dan
// dasbor admin. Kembarannya ada di backend (member_count/file_kinds_for di
// server.py) — ubah keduanya bila daftar kategori atau jenis berkas berubah.

export const MAX_MEMBERS = 5;

export const FILE_BASES = [
  { base: "data_diri", label: "Data Diri", hint: "KK/Ijazah/Rapor", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
  { base: "surat_sehat", label: "Surat Sehat", hint: "Keterangan sehat", accept: ".pdf,.jpg,.jpeg,.png,.webp" },
  { base: "foto", label: "Pas Foto", hint: "JPG/PNG", accept: ".jpg,.jpeg,.png,.webp" },
];

// Berkas anggota pertama tetap tanpa akhiran (data_diri, surat_sehat, foto)
// supaya pendaftar lama, link di Google Sheets, dan tombol admin tetap jalan.
export const kindFor = (base, memberIndex) =>
  (memberIndex === 0 ? base : `${base}_${memberIndex + 1}`);

// Jumlah anggota terbanyak yang boleh didaftarkan kategori ini
// (0 = atlet tunggal).
export const memberCount = (category = "") =>
  category.includes("Berkelompok") ? MAX_MEMBERS : category.includes("Ganda") ? 2 : 0;

// Jumlah anggota yang wajib ada. Berkelompok cukup 3 orang; anggota ke-4 dan
// ke-5 opsional, jadi regu kecil tetap bisa mendaftar.
export const minMemberCount = (category = "") =>
  category.includes("Berkelompok") ? 3 : category.includes("Ganda") ? 2 : 0;

// Semua berkas untuk sejumlah anggota, berurutan per anggota.
export const fileKindsForCount = (jumlah) =>
  Array.from({ length: Math.max(jumlah, 1) }, (_, member) =>
    FILE_BASES.map((b) => ({ ...b, member, key: kindFor(b.base, member) }))).flat();

export const memberLabel = (index, total) =>
  (total > 1 ? `Anggota ${index + 1}` : "Atlet");
