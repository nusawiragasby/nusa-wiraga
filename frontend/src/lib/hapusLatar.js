// Memisahkan orang dari latar pas foto, langsung di browser admin.
//
// Model: MODNet (portrait matting, lisensi Apache-2.0) lewat transformers.js.
// Foto tidak dikirim ke layanan mana pun — modelnya yang diunduh, sekali,
// lalu disimpan di cache browser. Pustaka & model dimuat hanya saat admin
// pertama kali membuat ID card, jadi pengunjung situs tidak ikut menanggung
// ukurannya.

const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";
const MODEL = "Xenova/modnet";

let siap = null;
const muat = () => {
  if (!siap) {
    siap = (async () => {
      const t = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
      const [model, processor] = await Promise.all([
        t.AutoModel.from_pretrained(MODEL, { dtype: "fp32" }),
        t.AutoProcessor.from_pretrained(MODEL),
      ]);
      return { t, model, processor };
    })().catch((e) => {
      siap = null; // boleh dicoba lagi, mis. setelah koneksi pulih
      throw e;
    });
  }
  return siap;
};

/** Mulai unduh model lebih awal, mis. saat dialog berkas dibuka. */
export const siapkanHapusLatar = () => { muat().catch(() => {}); };

/**
 * @param {Blob} foto pas foto
 * @returns {Promise<HTMLCanvasElement>} foto dengan latar transparan
 */
export async function hapusLatar(foto) {
  const { t, model, processor } = await muat();
  const gambar = await t.RawImage.fromBlob(foto);
  const { pixel_values } = await processor(gambar);
  const { output } = await model({ input: pixel_values });
  const matte = await t.RawImage.fromTensor(output[0].mul(255).to("uint8"))
    .resize(gambar.width, gambar.height);

  const kanvas = document.createElement("canvas");
  kanvas.width = gambar.width;
  kanvas.height = gambar.height;
  const ctx = kanvas.getContext("2d");
  const bitmap = await createImageBitmap(foto);
  ctx.drawImage(bitmap, 0, 0, gambar.width, gambar.height);
  bitmap.close?.();
  const piksel = ctx.getImageData(0, 0, gambar.width, gambar.height);
  // Matte satu kanal (0 = latar, 255 = orang) jadi kanal alfa.
  for (let i = 0; i < matte.data.length; i++) piksel.data[i * 4 + 3] = matte.data[i];
  ctx.putImageData(piksel, 0, 0);
  return kanvas;
}
