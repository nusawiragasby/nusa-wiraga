// Mengecilkan foto di browser sebelum diunggah (resize + re-encode JPEG),
// supaya foto HP yang biasanya 3-5 MB turun ke ratusan KB. File non-gambar
// (mis. PDF) dikembalikan apa adanya.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

export async function compressImage(file) {
  if (!file.type?.startsWith("image/") || file.type === "image/gif") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
