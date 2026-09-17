// Mengecilkan foto di browser sebelum diunggah (resize + re-encode), supaya
// foto HP yang biasanya 3-5 MB turun ke puluhan/ratusan KB. File non-gambar
// (mis. PDF) dikembalikan apa adanya.
//
// Ukuran unggahan menentukan lama submit: kategori beregu mengirim 15 berkas
// sekaligus, jadi tiap KB yang dihemat terasa langsung oleh pendaftar.
// WebP dipakai lebih dulu karena ~30% lebih kecil daripada JPEG pada mutu
// setara; browser yang belum bisa meng-encode WebP otomatis jatuh ke JPEG.
const QUALITY = 0.72;

// Pas foto dicetak kecil, jadi tidak perlu seresolusi berkas dokumen yang
// tulisannya harus tetap terbaca panitia.
export const MAX_DIMENSION_PHOTO = 900;
export const MAX_DIMENSION_DOC = 1400;

const toBlob = (canvas, type) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));

export async function compressImage(file, maxDimension = MAX_DIMENSION_DOC) {
  if (!file.type?.startsWith("image/") || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  // Safari lama mengabaikan tipe yang tidak didukung dan mengembalikan PNG,
  // yang justru jauh lebih besar — makanya tipe hasilnya diperiksa.
  let blob = await toBlob(canvas, "image/webp");
  if (blob?.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg");
  if (!blob || blob.size >= file.size) return file;

  const ext = blob.type === "image/webp" ? ".webp" : ".jpg";
  const newName = file.name.replace(/\.[^.]+$/, "") + ext;
  return new File([blob], newName, { type: blob.type });
}
