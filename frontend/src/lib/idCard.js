// ID card peserta, digambar di browser admin dari template panitia.
//
// Template (public/idcard/template-v2.webp) sudah dibersihkan dari tulisan contoh
// "NAMA", "KELAS/KATEGORI", dan "KONTINGEN". Urutan lapisannya:
//   1. template
//   2. orangnya saja, latar pas fotonya dibuang (lihat hapusLatar.js);
//      dipotong rata di tepi atas bar NAMA supaya potongan bawah pas foto
//      tersembunyi di balik bar
//   3. nama, kelas/kategori, kontingen
//
// Semua ukuran di bawah dalam piksel template asli (591 x 1004); kanvas
// digambar SKALA kali lebih besar supaya teks dan foto tajam saat dicetak.

import { hapusLatar } from "@/lib/hapusLatar";

// Nama berkas diberi versi: gambar di-cache browser 30 hari (vercel.json),
// jadi template baru harus bernama baru supaya tidak tertukar yang lama.
const TEMPLATE_URL = "/idcard/template-v2.webp";
const LEBAR = 591;
const TINGGI = 1004;
const SKALA = 2;

// Tempat foto (sama seperti template sebelumnya). Bawahnya ditutup bar NAMA.
const FOTO = { x: 113, y: 312, w: 445, h: 509 };
const BATAS_BAWAH_FOTO = 755; // tepi atas bar NAMA
// Pas foto lebih tinggi daripada tempatnya, jadi ada yang terpotong; lebih
// banyak diambil dari bawah supaya kepala tidak terpenggal.
const FOTO_TITIK_TENGAH_Y = 0.3;
// Bila orangnya menyentuh tepi pas foto (rambut di atas, bahu di samping),
// potongannya dilembutkan selebar ini supaya tidak tampak garis lurus di
// atas latar merah.
const LEMBUT = 0.05;

const NAMA = { cx: 298, cy: 797, maxW: 470, ukuran: 30, minimal: 23, warna: "#ffffff" };
const KELAS = { cx: 300, cy: 894, maxW: 420, ukuran: 28, minimal: 19, warna: "#840e00" };
const KONTINGEN = { cx: 306, cy: 967, maxW: 360, ukuran: 28, minimal: 20, warna: "#790c0d" };

// Tulisan contoh di template memakai huruf tegak rapat; Oswald paling mirip
// dan memuat nama panjang lebih banyak daripada huruf situs.
const HURUF_CSS = "https://fonts.googleapis.com/css2?family=Oswald:wght@600&display=swap";
const HURUF = "Oswald, 'Arial Narrow', sans-serif";
const BERAT = 600;

const dimuat = {};
const muatGambar = (url) => {
  if (!dimuat[url]) {
    dimuat[url] = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Template ID card gagal dimuat"));
      img.src = url;
    }).catch((e) => {
      delete dimuat[url]; // boleh dicoba lagi
      throw e;
    });
  }
  return dimuat[url];
};

let hurufDimuat = null;
const muatHuruf = () => {
  if (!hurufDimuat) {
    if (!document.querySelector(`link[href="${HURUF_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = HURUF_CSS;
      document.head.appendChild(link);
    }
    // Gagal dimuat (mis. offline) tidak menggagalkan kartu: huruf cadangan.
    hurufDimuat = new Promise((r) => setTimeout(r, 50))
      .then(() => document.fonts?.load(`${BERAT} 30px Oswald`))
      .catch(() => {});
  }
  return hurufDimuat;
};

const font = (ukuran) => `${BERAT} ${ukuran * SKALA}px ${HURUF}`;

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
  for (let ukuran = kotak.ukuran - 6; ukuran >= kotak.minimal - 4; ukuran--) {
    ctx.font = font(ukuran);
    const muat = baris.every((b) => ctx.measureText(b).width <= maxW);
    if (muat || ukuran === kotak.minimal - 4) {
      const jarak = ukuran * 1.05 * SKALA;
      baris.forEach((b, i) => ctx.fillText(b, kotak.cx * SKALA, kotak.cy * SKALA + (i - 0.5) * jarak, maxW));
      return;
    }
  }
};

// Lembutkan tepi atas, kiri, dan kanan foto yang sudah tanpa latar.
const lembutkanTepi = (sumber) => {
  const k = document.createElement("canvas");
  k.width = sumber.width;
  k.height = sumber.height;
  const ctx = k.getContext("2d");
  ctx.drawImage(sumber, 0, 0);
  ctx.globalCompositeOperation = "destination-in";
  const lebar = Math.round(Math.min(k.width, k.height) * LEMBUT);
  const pudar = (x0, y0, x1, y1, rx, ry, rw, rh) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,1)");
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  pudar(0, 0, 0, lebar, 0, 0, k.width, k.height);                  // atas
  pudar(0, 0, lebar, 0, 0, 0, k.width, k.height);                  // kiri
  pudar(k.width, 0, k.width - lebar, 0, 0, 0, k.width, k.height);  // kanan
  return k;
};

// `foto` berupa Blob (pas foto asli) atau kanvas (orang tanpa latar).
const gambarFoto = async (ctx, foto) => {
  const sumber = foto instanceof Blob
    ? await createImageBitmap(foto).catch(() => { throw new Error("Pas foto tidak bisa dibaca sebagai gambar"); })
    : lembutkanTepi(foto);
  const kotak = { x: FOTO.x * SKALA, y: FOTO.y * SKALA, w: FOTO.w * SKALA, h: FOTO.h * SKALA };
  // object-fit: cover
  const skala = Math.max(kotak.w / sumber.width, kotak.h / sumber.height);
  const w = sumber.width * skala;
  const h = sumber.height * skala;
  const x = kotak.x + (kotak.w - w) / 2;
  const y = kotak.y + (kotak.h - h) * FOTO_TITIK_TENGAH_Y;
  ctx.save();
  ctx.beginPath();
  // Foto asli (latar gagal dibuang) tetap dibingkai di tempatnya; orang tanpa
  // latar boleh melewati tepi atas tempat foto, hanya bawahnya yang dipotong.
  if (foto instanceof Blob) ctx.rect(kotak.x, kotak.y, kotak.w, BATAS_BAWAH_FOTO * SKALA - kotak.y);
  else ctx.rect(0, 0, LEBAR * SKALA, BATAS_BAWAH_FOTO * SKALA);
  ctx.clip();
  ctx.drawImage(sumber, x, y, w, h);
  ctx.restore();
  sumber.close?.();
};

/** Baris kelas/kategori: kelas untuk peserta tanding, kategori untuk seni. */
export const kelasAtauKategori = (reg) =>
  ((reg?.category || "").includes("Tanding") && reg?.weight_class ? reg.weight_class : reg?.category || "");

/**
 * Gambar satu ID card.
 * @param {{nama: string, kelas: string, kontingen: string, foto: Blob}} peserta
 * @returns {Promise<{blob: Blob, latarDihapus: boolean}>} JPEG siap
 *   unduh/cetak (1182 x 2008 px). Bila latar foto gagal dibuang (mis. model
 *   tidak bisa diunduh), kartu tetap dibuat dengan foto aslinya.
 */
export async function buatIdCard({ nama, kelas, kontingen, foto }) {
  if (!foto) throw new Error("Pas foto belum ada");
  let orang = foto;
  let latarDihapus = false;
  try {
    orang = await hapusLatar(foto);
    latarDihapus = true;
  } catch (e) {
    console.warn("Latar foto gagal dibuang, memakai foto asli:", e);
  }
  const [template] = await Promise.all([muatGambar(TEMPLATE_URL), muatHuruf()]);
  const kanvas = document.createElement("canvas");
  kanvas.width = LEBAR * SKALA;
  kanvas.height = TINGGI * SKALA;
  const ctx = kanvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(template, 0, 0, kanvas.width, kanvas.height);
  await gambarFoto(ctx, orang);
  tulis(ctx, nama, NAMA);
  tulis(ctx, kelas, KELAS);
  tulis(ctx, kontingen, KONTINGEN);
  const blob = await new Promise((resolve, reject) =>
    kanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Gagal membuat gambar ID card"))), "image/jpeg", 0.92));
  return { blob, latarDihapus };
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
