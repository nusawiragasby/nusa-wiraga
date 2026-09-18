import { Reveal } from "@/components/Reveal";
import { Radio, Trophy, Medal } from "lucide-react";

const ARENAS = [
  { name: "Gelanggang A", type: "Tanding", status: "Dibuka 10 Oktober 2026" },
  { name: "Gelanggang B", type: "Tanding", status: "Dibuka 10 Oktober 2026" },
  { name: "Gelanggang C", type: "Seni (TGR)", status: "Dibuka 11 Oktober 2026" },
];

const MEDAL_ORDER = [
  { value: "emas", label: "Emas", cls: "border-amber-500/40 bg-amber-500/10", icon: "text-amber-400" },
  { value: "perak", label: "Perak", cls: "border-slate-400/40 bg-slate-400/10", icon: "text-slate-300" },
  { value: "perunggu", label: "Perunggu", cls: "border-orange-700/40 bg-orange-700/10", icon: "text-orange-400" },
];

export const ResultsSection = ({ results = [] }) => {
  return (
    <section id="hasil" className="mx-auto max-w-7xl px-4 py-24 sm:px-6" data-testid="results-section">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Hasil Pertandingan</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
        Bagan & <span className="text-gold-gradient">Papan Skor</span>
      </h2>
      {results.length === 0 ? (
        <>
          <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
            Hasil pertandingan, bagan, dan perolehan medali akan diumumkan di halaman ini selama
            kejuaraan berlangsung (10 - 11 Oktober 2026) dan diarsipkan setelahnya.
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {ARENAS.map((a, i) => (
              <Reveal key={a.name} delay={i * 0.1}
                className="rounded-2xl border border-[#2E2E3A] bg-[#13131A] p-6" data-testid={`arena-card-${i}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold sm:text-xl">{a.name}</h3>
                  <span className="flex items-center gap-1.5 rounded-full bg-[#800E19]/40 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Radio className="h-3 w-3" /> {a.type}
                  </span>
                </div>
                <div className="mt-8 flex flex-col items-center py-6 text-center">
                  <Trophy className="h-10 w-10 text-amber-500/50" />
                  <p className="mt-3 text-sm font-semibold text-slate-300">Segera Hadir</p>
                  <p className="mt-1 text-xs text-slate-500">{a.status}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-3" data-testid="champions-board">
          {MEDAL_ORDER.map((m, mi) => {
            const list = results.filter((r) => r.medal === m.value);
            return (
              <Reveal key={m.value} delay={mi * 0.1}
                className={`rounded-2xl border p-6 ${m.cls}`} data-testid={`medal-column-${m.value}`}>
                <h3 className="flex items-center gap-2 font-display text-lg font-extrabold">
                  <Medal className={`h-5 w-5 ${m.icon}`} /> Medali {m.label}
                  <span className="ml-auto text-sm text-slate-400">{list.length}</span>
                </h3>
                <div className="mt-4 space-y-3">
                  {list.length === 0 && <p className="py-4 text-center text-xs text-slate-500">Belum ada</p>}
                  {list.map((r) => (
                    <div key={r.id} className="rounded-xl border border-[#2E2E3A] bg-[#0B0B0E]/60 p-4" data-testid={`champion-${r.id}`}>
                      <p className="text-sm font-bold">{r.athlete}</p>
                      <p className="text-xs text-amber-400">{r.contingent}</p>
                      <p className="mt-1 text-xs text-slate-500">{r.category} · {r.division}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </section>
  );
};
