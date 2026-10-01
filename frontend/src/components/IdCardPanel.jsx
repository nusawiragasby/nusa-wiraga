import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, IdCard, Loader2 } from "lucide-react";
import { buatIdCard, namaBerkasIdCard, unduhBlob } from "@/lib/idCard";

/**
 * Daftar ID card untuk satu pendaftaran (satu kartu per anggota).
 *
 * peserta: [{ nama, ambilFoto: () => Promise<Blob> }]
 * pratinjau: gambar semua kartu begitu tampil dan tunjukkan gambarnya —
 *   dipakai di dialog sukses, saat fotonya masih ada di browser. Admin
 *   mengambil foto dari server, jadi kartunya baru dibuat saat diunduh.
 */
export function IdCardPanel({ peserta, kontingen, regNumber, pratinjau = false, testId = "idcard-panel" }) {
  const [kartu, setKartu] = useState({});
  const [sibuk, setSibuk] = useState(null);
  const urls = useRef([]);
  const pesertaRef = useRef(peserta);
  pesertaRef.current = peserta;

  const buat = async (i) => {
    const p = pesertaRef.current[i];
    const blob = await buatIdCard({ nama: p.nama, kontingen, foto: await p.ambilFoto() });
    const url = URL.createObjectURL(blob);
    urls.current.push(url);
    setKartu((k) => ({ ...k, [i]: { blob, url } }));
    return blob;
  };

  const kunci = peserta.map((p) => p.nama).join("|");
  useEffect(() => {
    if (!pratinjau) return undefined;
    let batal = false;
    (async () => {
      // Berurutan, bukan sekaligus: lima kanvas besar bersamaan terasa berat
      // di HP murah.
      for (let i = 0; i < pesertaRef.current.length && !batal; i++) {
        try {
          await buat(i);
        } catch (e) {
          if (!batal) setKartu((k) => ({ ...k, [i]: { error: e.message } }));
        }
      }
    })();
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pratinjau, kunci, kontingen]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const unduh = async (i) => {
    setSibuk(i);
    try {
      const blob = kartu[i]?.blob || (await buat(i));
      unduhBlob(blob, namaBerkasIdCard(regNumber, peserta[i].nama));
    } catch (e) {
      toast.error(`ID card ${peserta[i].nama}: ${e.message}`);
    } finally {
      setSibuk(null);
    }
  };

  if (!pratinjau) {
    return (
      <div className="flex flex-wrap gap-2" data-testid={testId}>
        {peserta.map((p, i) => (
          <button key={i} type="button" onClick={() => unduh(i)} disabled={sibuk !== null}
            data-testid={`${testId}-btn-${i}`}
            className="flex items-center gap-1.5 rounded-lg border border-[#2E2E3A] px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-[#1C1C24] disabled:opacity-50">
            {sibuk === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <IdCard className="h-3.5 w-3.5" />}
            ID Card{peserta.length > 1 ? ` ${i + 1}` : ""}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#2E2E3A] bg-[#0B0B0E] p-4" data-testid={testId}>
      <p className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <IdCard className="h-4 w-4 text-amber-400" /> ID Card Peserta
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Unduh sekarang. Setelah jendela ini ditutup, ID card bisa diminta ulang ke panitia.
      </p>
      <div className={`mt-3 grid gap-3 ${peserta.length > 1 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 justify-items-center"}`}>
        {peserta.map((p, i) => {
          const k = kartu[i];
          return (
            <div key={i} className="flex w-full max-w-[160px] flex-col items-center gap-2">
              <div className="flex aspect-[591/1004] w-full items-center justify-center overflow-hidden rounded-lg border border-[#2E2E3A] bg-[#13131A]">
                {k?.url ? (
                  <img src={k.url} alt={`ID card ${p.nama}`} className="h-full w-full object-cover" data-testid={`${testId}-img-${i}`} />
                ) : k?.error ? (
                  <span className="px-2 text-center text-[10px] text-red-400">{k.error}</span>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                )}
              </div>
              <button type="button" onClick={() => unduh(i)} disabled={!k?.url || sibuk !== null}
                data-testid={`${testId}-btn-${i}`}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-2 py-1.5 text-xs font-extrabold text-stone-900 disabled:opacity-50">
                {sibuk === i ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="truncate">{peserta.length > 1 ? p.nama.split(" ")[0] : "Unduh ID Card"}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
