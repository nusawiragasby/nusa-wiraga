// Aturan keanggotaan & berkas per kategori, dipakai formulir pendaftaran dan
// dasbor admin. Kembarannya ada di backend (member_count/file_kinds_for di
// server.py) — ubah keduanya bila daftar kategori atau jenis berkas berubah.

export const MAX_MEMBERS = 5;

export const FILE_BASES = [
  { base: "data_diri", label: "Data Diri", hint: "KK/Ijazah/Rapor", accept: ".pdf,.jpg,.jpeg,.png" },
  { base: "surat_sehat", label: "Surat Sehat", hint: "Keterangan sehat", accept: ".pdf,.jpg,.jpeg,.png" },
  { base: "foto", label: "Pas Foto", hint: "JPG/PNG", accept: ".jpg,.jpeg,.png" },
];

// Berkas anggota pertama tetap tanpa akhiran (data_diri, surat_sehat, foto)
// supaya pendaftar lama, link di Google Sheets, dan tombol admin tetap jalan.
export const kindFor = (base, memberIndex) =>
  (memberIndex === 0 ? base : `${base}_${memberIndex + 1}`);

// Jumlah nama anggota yang wajib diisi kategori ini (0 = atlet tunggal).
export const memberCount = (category = "") =>
  category.includes("Berkelompok") ? MAX_MEMBERS : category.includes("Ganda") ? 2 : 0;

// Satu set berkas per anggota; atlet tunggal tetap satu set.
export const fileSetCount = (category = "") => Math.max(memberCount(category), 1);

// Semua berkas wajib kategori ini, berurutan per anggota.
export const fileKindsFor = (category = "") =>
  Array.from({ length: fileSetCount(category) }, (_, member) =>
    FILE_BASES.map((b) => ({ ...b, member, key: kindFor(b.base, member) }))).flat();

export const memberLabel = (index, total) =>
  (total > 1 ? `Anggota ${index + 1}` : "Atlet");
