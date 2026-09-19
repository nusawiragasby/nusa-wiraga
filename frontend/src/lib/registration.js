// Aturan keanggotaan & berkas per kategori, dipakai formulir pendaftaran dan
// dasbor admin. Kembarannya ada di backend (member_count/file_kinds_for di
// server.py) — ubah keduanya bila daftar kategori atau jenis berkas berubah.

// Kategori yang dipertandingkan. Dipakai formulir pendaftaran, penyaring
// dasbor, pengelola bagan, dan pengelola hasil — dulu keempatnya menyimpan
// salinannya sendiri.
export const CATEGORIES = [
  "Tanding Putra",
  "Tanding Putri",
  "Seni Tunggal Putra",
  "Seni Tunggal Putri",
  "Seni Ganda Putra",
  "Seni Ganda Putri",
  "Berkelompok (Jurus Baku)",
];

// Kelompok usia. Ditaruh di sini karena dipakai formulir pendaftaran dan
// pengelola bagan — dulu masing-masing punya salinan sendiri dan berpotensi
// berbeda diam-diam.
export const AGE_CLASSES = [
  "Usia Dini 1 (5-8 Thn)",
  "Usia Dini 2 (8-11 Thn)",
  "Pra Remaja (11-14 Thn)",
];

// Kelas berat mengikuti kelompok usia, sesuai tabel resmi panitia.
// Usia Dini 1 memakai rentang yang sama dengan Usia Dini 2, tetapi hanya
// sampai Kelas F — G sampai M tidak dipertandingkan di kelompok itu.
const KELAS_DINI = [
  "Under 1 (20-23 kg)", "Under 2 (23-26 kg)",
  "Kelas A (26-28 kg)", "Kelas B (>28-30 kg)", "Kelas C (>30-32 kg)",
  "Kelas D (>32-34 kg)", "Kelas E (>34-36 kg)", "Kelas F (>36-38 kg)",
  "Kelas G (>38-40 kg)", "Kelas H (>40-42 kg)", "Kelas I (>42-44 kg)",
  "Kelas J (>44-46 kg)", "Kelas K (>46-48 kg)", "Kelas L (>48-50 kg)",
  "Kelas M (>50-52 kg)",
];

const KELAS_PRA_REMAJA = [
  "Under 1 (25-27 kg)", "Under 2 (27-30 kg)",
  "Kelas A (30-33 kg)", "Kelas B (>33-36 kg)", "Kelas C (>36-39 kg)",
  "Kelas D (>39-42 kg)", "Kelas E (>42-45 kg)", "Kelas F (>45-48 kg)",
  "Kelas G (>48-51 kg)", "Kelas H (>51-54 kg)", "Kelas I (>54-57 kg)",
  "Kelas J (>57-60 kg)", "Kelas K (>60-63 kg)", "Kelas L (>63-66 kg)",
  "Kelas M (66-69 kg)",
];

// Batas Usia Dini 1: Under 1 sampai Kelas F.
const BATAS_DINI_1 = 8;

export const weightClassesFor = (ageClass = "") => {
  if (ageClass.includes("Usia Dini 1")) return KELAS_DINI.slice(0, BATAS_DINI_1);
  if (ageClass.includes("Usia Dini 2")) return KELAS_DINI;
  if (ageClass.includes("Pra Remaja")) return KELAS_PRA_REMAJA;
  return [];
};

// Untuk penyaringan di dasbor, di mana kelompok usianya bisa belum dipilih.
export const ALL_WEIGHT_CLASSES = [...new Set([...KELAS_DINI, ...KELAS_PRA_REMAJA])];

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
