import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, IdCard, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buatIdCard, namaBerkasIdCard, unduhBlob } from "@/lib/idCard";
import { siapkanHapusLatar } from "@/lib/hapusLatar";

/**
 * Tombol ID card, khusus dasbor admin (peserta tidak mendapatkannya
 * sendiri). Satu tombol per anggota; kartunya ditampilkan dulu, baru
 * diunduh bila admin menekan Unduh.
 *
 * peserta: [{ nama, ambilFoto: () => Promise<Blob> }]
 * kelas: baris kelas/kategori (lihat kelasAtauKategori di lib/idCard.js)
 */
export function IdCardPanel({ peserta, kelas, kontingen, regNumber, testId = "idcard-panel" }) {
  const [sibuk, setSibuk] = useState(null);
  const [pratinjau, setPratinjau] = useState(null); // { nama, blob, url, latarDihapus, bukanFotoOrang }

  // Model pembuang latar ~25 MB; unduhannya dimulai begitu tombol tampil,
  // supaya klik pertama tidak menunggu selama itu.
  useEffect(() => { siapkanHapusLatar(); }, []);

  // URL gambar pratinjau dilepas begitu tidak dipakai lagi.
  useEffect(() => () => { if (pratinjau) URL.revokeObjectURL(pratinjau.url); }, [pratinjau]);

  const tampilkan = async (i) => {
    setSibuk(i);
    try {
      const foto = await peserta[i].ambilFoto();
      const { blob, latarDihapus, bukanFotoOrang } = await buatIdCard({ nama: peserta[i].nama, kelas, kontingen, foto });
      setPratinjau({ nama: peserta[i].nama, blob, url: URL.createObjectURL(blob), latarDihapus, bukanFotoOrang });
    } catch (e) {
      toast.error(`ID card ${peserta[i].nama}: ${e.message}`);
    } finally {
      setSibuk(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2" data-testid={testId}>
        {peserta.map((p, i) => (
          <button key={i} type="button" onClick={() => tampilkan(i)} disabled={sibuk !== null}
            data-testid={`${testId}-btn-${i}`} title="Lihat ID card (latar foto dihapus otomatis)"
            className="flex items-center gap-1.5 rounded-lg border border-[#2E2E3A] px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-[#1C1C24] disabled:opacity-50">
            {sibuk === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IdCard className="h-3.5 w-3.5" />}
            {sibuk === i ? "Menyiapkan…" : `ID Card${peserta.length > 1 ? ` ${i + 1}` : ""}`}
          </button>
        ))}
      </div>

      <Dialog open={!!pratinjau} onOpenChange={(buka) => !buka && setPratinjau(null)}>
        <DialogContent className="max-h-[95vh] max-w-md overflow-y-auto border-[#2E2E3A] bg-[#13131A] text-slate-50" data-testid={`${testId}-preview`}>
          <DialogHeader>
            <DialogTitle className="font-display">ID Card {regNumber}</DialogTitle>
            <DialogDescription className="text-slate-400">{pratinjau?.nama}</DialogDescription>
          </DialogHeader>
          {pratinjau && (
            <>
              {pratinjau.bukanFotoOrang ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300" data-testid={`${testId}-bukan-orang`}>
                  Tidak ada orang yang terdeteksi di Pas Foto — kemungkinan yang diunggah bukan pas foto
                  (mis. foto dokumen). Minta pas foto yang benar, lalu ganti lewat tombol unggah di kolom Pas Foto.
                </p>
              ) : !pratinjau.latarDihapus && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
                  Latar foto gagal dihapus, ID card memakai foto asli. Coba tutup lalu buka lagi setelah koneksi stabil.
                </p>
              )}
              <img src={pratinjau.url} alt={`ID card ${pratinjau.nama}`} data-testid={`${testId}-preview-img`}
                className="mx-auto max-h-[65vh] w-auto rounded-lg border border-[#2E2E3A]" />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPratinjau(null)}
                  className="rounded-lg border border-[#2E2E3A] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-[#1C1C24]">
                  Tutup
                </button>
                <button type="button" data-testid={`${testId}-download`}
                  onClick={() => unduhBlob(pratinjau.blob, namaBerkasIdCard(regNumber, pratinjau.nama))}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-extrabold text-stone-900 hover:opacity-90">
                  <Download className="h-4 w-4" /> Unduh
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
