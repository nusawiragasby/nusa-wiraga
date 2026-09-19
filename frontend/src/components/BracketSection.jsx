import { Reveal } from "@/components/Reveal";
import { GitFork, Swords, Clock, Trophy } from "lucide-react";
import { roundsOf, roundLabel } from "@/lib/bracket";

const Slot = ({ name, won }) => (
  <div className={`flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs ${
    won ? "bg-amber-500/15 font-bold text-amber-300" : "text-slate-300"}`}>
    <span className="truncate">{name || <span className="text-slate-600">—</span>}</span>
    {won && <Trophy className="h-3 w-3 shrink-0 text-amber-400" />}
  </div>
);

const MatchCard = ({ m }) => (
  <div className="rounded-xl border border-[#2E2E3A] bg-[#13131A] p-1.5" data-testid={`bracket-match-${m.id}`}>
    <Slot name={m.p1} won={m.winner === 1} />
    <div className="my-0.5 border-t border-[#2E2E3A]" />
    <Slot name={m.p2} won={m.winner === 2} />
    {(m.score || m.schedule) && (
      <p className="mt-1 px-1 text-[10px] text-slate-500">
        {m.schedule}{m.score ? ` · ${m.score}` : ""}
      </p>
    )}
  </div>
);

const BracketView = ({ matches }) => {
  const rounds = roundsOf(matches);
  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map(({ round, matches: rm }) => (
          <div key={round} className="flex w-52 flex-col">
            <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-amber-400">
              {roundLabel(round, rounds.length)}
            </p>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {rm.map((m) => <MatchCard key={m.id} m={m} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ListView = ({ matches }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {matches.map((m) => (
      <div key={m.id} className="flex items-center gap-3 rounded-xl border border-[#2E2E3A] bg-[#13131A] p-3" data-testid={`bracket-list-item-${m.id}`}>
        <Swords className="h-4 w-4 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">
            <span className={m.winner === 1 ? "text-amber-300" : ""}>{m.p1 || "—"}</span>
            {m.p2 ? <> <span className="text-slate-500">vs</span> <span className={m.winner === 2 ? "text-amber-300" : ""}>{m.p2}</span></> : null}
          </p>
          {(m.schedule || m.score) && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> {m.schedule}{m.score ? ` · ${m.score}` : ""}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
);

export const BracketSection = ({ brackets = [] }) => {
  // Section tetap dirender walau bagannya belum ada: menu "Bagan" menaut ke
  // #bagan, dan kalau elemennya hilang tautan itu mati tanpa penjelasan.
  return (
    <section id="bagan" className="mx-auto max-w-7xl px-4 py-24 sm:px-6" data-testid="bracket-section">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Bagan Pertandingan</p>
      <h2 className="mt-3 flex items-center gap-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
        <GitFork className="h-7 w-7 text-amber-400" /> Jalan Menuju <span className="text-gold-gradient">Final</span>
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
        Bagan dan jadwal pertandingan yang disusun panitia. Diperbarui selama kejuaraan berlangsung.
      </p>
      {brackets.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#2E2E3A] bg-[#0B0B0E]/40 p-8 text-center"
          data-testid="bracket-empty">
          <GitFork className="mx-auto h-8 w-8 text-amber-400/70" />
          <p className="mt-3 text-sm font-semibold text-slate-300">Bagan belum diumumkan</p>
          <p className="mt-1 text-sm text-slate-500">
            Undian dan bagan pertandingan disusun setelah technical meeting, lalu ditayangkan di sini.
          </p>
        </div>
      ) : (
      <div className="mt-10 space-y-8">
        {brackets.map((b, i) => (
          <Reveal key={b.id} delay={(i % 4) * 0.08}
            className="rounded-2xl border border-[#2E2E3A] bg-[#0B0B0E]/40 p-4 sm:p-6" data-testid={`bracket-card-${b.id}`}>
            <h3 className="mb-4 text-lg font-bold sm:text-xl">{b.title}</h3>
            {b.kind === "bracket" ? <BracketView matches={b.matches} /> : <ListView matches={b.matches} />}
          </Reveal>
        ))}
      </div>
      )}
    </section>
  );
};
