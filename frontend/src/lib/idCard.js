// ID card peserta, digambar di browser dari template panitia.
//
// Template (public/idcard/template.webp) sudah dibersihkan dari tulisan
// contoh "NAMA"/"KONTINGEN", dan pemandangan contoh di jendela fotonya dibuat
// transparan. Urutan gambarnya karena itu: foto dulu, template di atasnya —
// spanduk kuning kiri-atas dan lengkung kuning kanan-bawah memang menimpa
// foto di desain aslinya.
//
// Semua ukuran di bawah dalam piksel template asli (591 x 1004); kanvas
// digambar SKALA kali lebih besar supaya teks dan foto tajam saat dicetak.

const TEMPLATE_URL = "/idcard/template.webp";
const LEBAR = 591;
const TINGGI = 1004;
const SKALA = 2;

// Jendela foto, sampai tepi atas bar NAMA.
const FOTO = { x: 113, y: 312, w: 445, h: 509 };
// Pas foto lebih tinggi daripada jendelanya, jadi ada yang terpotong; lebih
// banyak diambil dari bawah supaya kepala tidak terpenggal.
const FOTO_TITIK_TENGAH_Y = 0.3;

const NAMA = { cx: 299, cy: 843, cyDuaBaris: 859, maxW: 460, ukuran: 28, minimal: 17, warna: "#ffffff" };
const KONTINGEN = { cx: 306, cy: 941, cyDuaBaris: 941, maxW: 360, ukuran: 26, minimal: 15, warna: "#67181c" };
const HURUF = "Outfit, 'IBM Plex Sans', system-ui, sans-serif";

let templateDimuat = null;
const muatTemplate = () => {
  if (!templateDimuat) {
    templateDimuat = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Template ID card gagal dimuat"));
      img.src = TEMPLATE_URL;
    }).catch((e) => {
      templateDimuat = null; // boleh dicoba lagi
      throw e;
    });
  }
  return templateDimuat;
};

const font = (ukuran) => `700 ${ukuran * SKALA}px ${HURUF}`;

// Bagi teks jadi dua baris di spasi yang membuat keduanya paling seimbang.
const duaBaris = (teks) => {
  const kata = teks.split(" ");
  let terbaik = [teks, ""];
  let selisih = Infinity;
  for (let i = 1; i < kata.length; i++) {
    const a = kata.slice(0, i).join(" ");
    const b = kata.slice(i).join(" ");
    if (Math.abs(a.length - b.length) < selisih) {
      selisih = Math.abs(a.length - b.length);
      terbaik = [a, b];
    }
  }
  return terbaik;
};

// Tulis teks di tengah kotak: dikecilkan dulu, baru dipecah dua baris bila
// pada ukuran terkecil pun masih kepanjangan.
const tulis = (ctx, teks, kotak) => {
  const isi = (teks || "").trim().replace(/\s+/g, " ").toUpperCase();
  if (!isi) return;
  const maxW = kotak.maxW * SKALA;
  ctx.fillStyle = kotak.warna;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let ukuran = kotak.ukuran; ukuran >= kotak.minimal; ukuran--) {
    ctx.font = font(ukuran);
    if (ctx.measureText(isi).width <= maxW) {
      ctx.fillText(isi, kotak.cx * SKALA, kotak.cy * SKALA);
      return;
    }
  }
  const baris = duaBaris(isi);
  for (let ukuran = kotak.ukuran - 4; ukuran >= kotak.minimal - 3; ukuran--) {
    ctx.font = font(ukuran);
    const muat = baris.every((b) => ctx.measureText(b).width <= maxW);
    if (muat || ukuran === kotak.minimal - 3) {
      const jarak = ukuran * 1.1 * SKALA;
      const tengah = kotak.cyDuaBaris * SKALA;
      baris.forEach((b, i) => ctx.fillText(b, kotak.cx * SKALA, tengah + (i - 0.5) * jarak, maxW));
      return;
    }
  }
};

const gambarFoto = async (ctx, foto) => {
  const bitmap = await createImageBitmap(foto).catch(() => {
    throw new Error("Pas foto tidak bisa dibaca sebagai gambar");
  });
  const kotak = { x: FOTO.x * SKALA, y: FOTO.y * SKALA, w: FOTO.w * SKALA, h: FOTO.h * SKALA };
  // object-fit: cover
  const skala = Math.max(kotak.w / bitmap.width, kotak.h / bitmap.height);
  const w = bitmap.width * skala;
  const h = bitmap.height * skala;
  const x = kotak.x + (kotak.w - w) / 2;
  const y = kotak.y + (kotak.h - h) * FOTO_TITIK_TENGAH_Y;
  ctx.save();
  ctx.beginPath();
  ctx.rect(kotak.x, kotak.y, kotak.w, kotak.h);
  ctx.clip();
  ctx.drawImage(bitmap, x, y, w, h);
  ctx.restore();
  bitmap.close?.();
};

/**
 * Gambar satu ID card.
 * @param {{nama: string, kontingen: string, foto: Blob}} peserta
 * @returns {Promise<Blob>} JPEG siap unduh/cetak (1182 x 2008 px)
 */
export async function buatIdCard({ nama, kontingen, foto }) {
  if (!foto) throw new Error("Pas foto belum ada");
  const [template] = await Promise.all([
    muatTemplate(),
    // Huruf Outfit dimuat malas oleh halaman; tanpa menunggu, kanvas memakai
    // huruf cadangan. Kalau gagal dimuat, tetap lanjut dengan huruf cadangan.
    document.fonts?.load(font(NAMA.ukuran)).catch(() => {}),
  ]);
  const kanvas = document.createElement("canvas");
  kanvas.width = LEBAR * SKALA;
  kanvas.height = TINGGI * SKALA;
  const ctx = kanvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, kanvas.width, kanvas.height);
  ctx.imageSmoothingQuality = "high";
  await gambarFoto(ctx, foto);
  ctx.drawImage(template, 0, 0, kanvas.width, kanvas.height);
  tulis(ctx, nama, NAMA);
  tulis(ctx, kontingen, KONTINGEN);
  return new Promise((resolve, reject) =>
    kanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar ID card"))), "image/jpeg", 0.92));
}

export const namaBerkasIdCard = (regNumber, nama) =>
  `ID-Card-${regNumber || "peserta"}-${(nama || "").trim().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}.jpg`;

export function unduhBlob(blob, namaBerkas) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Dicabut belakangan: Safari membatalkan unduhan bila URL langsung dicabut.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
