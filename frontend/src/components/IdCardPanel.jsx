import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IdCard, Loader2 } from "lucide-react";
import { buatIdCard, namaBerkasIdCard, unduhBlob } from "@/lib/idCard";
import { siapkanHapusLatar } from "@/lib/hapusLatar";

/**
 * Tombol unduh ID card, khusus dasbor admin (peserta tidak mendapatkannya
 * sendiri). Satu tombol per anggota.
 *
 * peserta: [{ nama, ambilFoto: () => Promise<Blob> }]
 * kelas: baris kelas/kategori (lihat kelasAtauKategori di lib/idCard.js)
 */
export function IdCardPanel({ peserta, kelas, kontingen, regNumber, testId = "idcard-panel" }) {
  const [sibuk, setSibuk] = useState(null);

  // Model pembuang latar ~25 MB; unduhannya dimulai begitu tombol tampil,
  // supaya klik pertama tidak menunggu selama itu.
  useEffect(() => { siapkanHapusLatar(); }, []);

  const unduh = async (i) => {
    setSibuk(i);
    try {
      const foto = await peserta[i].ambilFoto();
      const { blob, latarDihapus } = await buatIdCard({ nama: peserta[i].nama, kelas, kontingen, foto });
      if (!latarDihapus) {
        toast.warning(`Latar foto ${peserta[i].nama} gagal dihapus, ID card memakai foto asli.`);
      }
      unduhBlob(blob, namaBerkasIdCard(regNumber, peserta[i].nama));
    } catch (e) {
      toast.error(`ID card ${peserta[i].nama}: ${e.message}`);
    } finally {
      setSibuk(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {peserta.map((p, i) => (
        <button key={i} type="button" onClick={() => unduh(i)} disabled={sibuk !== null}
          data-testid={`${testId}-btn-${i}`} title="Unduh ID card (latar foto dihapus otomatis)"
          className="flex items-center gap-1.5 rounded-lg border border-[#2E2E3A] px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-[#1C1C24] disabled:opacity-50">
          {sibuk === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IdCard className="h-3.5 w-3.5" />}
          {sibuk === i ? "Menyiapkan…" : `ID Card${peserta.length > 1 ? ` ${i + 1}` : ""}`}
        </button>
      ))}
    </div>
  );
}
