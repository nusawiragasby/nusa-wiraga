// Utilitas bagan gugur-tunggal (single elimination) yang dipakai bersama
// oleh panel admin dan tampilan publik. Mendukung 2, 3, 4, 8, 16, 32 peserta.
//
// Konvensi posisi: match di (round r, pos p) menyalurkan pemenangnya ke
// (round r+1, pos floor(p/2)), mengisi slot p1 bila p genap, p2 bila ganjil.
// Slot yang TIDAK disalurkan match manapun bersifat manual (diisi admin) —
// termasuk slot "bye" pada bagan 3 peserta.

const uid = () =>
  (crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const mk = (round, pos) => ({ id: uid(), round, pos, p1: "", p2: "", winner: null, score: "", schedule: "" });

// Buat kerangka pertandingan kosong sesuai jumlah peserta.
export function generateMatches(size) {
  if (size === 2) return [mk(1, 0)];                 // langsung final
  if (size === 3) return [mk(1, 0), mk(2, 0)];        // semifinal + final (1 bye)
  const matches = [];                                 // 4/8/16/32: pohon penuh
  let round = 1;
  let count = size / 2;
  while (count >= 1) {
    for (let pos = 0; pos < count; pos++) matches.push(mk(round, pos));
    count = count / 2;
    round += 1;
  }
  return matches;
}

// Nama pemenang dari sebuah match (atau "" bila belum ada).
export function winnerName(m) {
  if (m.winner === 1) return m.p1;
  if (m.winner === 2) return m.p2;
  return "";
}

// Isi slot babak berikutnya dari pemenang babak sebelumnya. Tidak bergantung
// pada ukuran power-of-2 — bekerja atas struktur match yang ada.
export function propagate(matches) {
  const byKey = new Map(matches.map((m) => [`${m.round}-${m.pos}`, { ...m }]));
  const maxRound = Math.max(...matches.map((m) => m.round));
  for (let r = 1; r < maxRound; r++) {
    for (const m of matches.filter((x) => x.round === r)) {
      const child = byKey.get(`${r}-${m.pos}`);
      const parent = byKey.get(`${r + 1}-${Math.floor(m.pos / 2)}`);
      if (!parent) continue;
      const slot = m.pos % 2 === 0 ? "p1" : "p2";
      const name = winnerName(child);
      if (parent[slot] !== name) {
        parent[slot] = name;
        if ((slot === "p1" && parent.winner === 1) || (slot === "p2" && parent.winner === 2)) parent.winner = null;
      }
    }
  }
  return [...byKey.values()].sort((a, b) => a.round - b.round || a.pos - b.pos);
}

// Kumpulan slot turunan (diisi otomatis dari pemenang) sebagai "matchId:p1|p2".
// Slot di luar himpunan ini manual: babak 1, dan slot bye pada bagan 3 orang.
export function derivedSlots(matches) {
  const set = new Set();
  const byKey = new Map(matches.map((m) => [`${m.round}-${m.pos}`, m]));
  const maxRound = Math.max(...matches.map((m) => m.round));
  for (const m of matches) {
    if (m.round >= maxRound) continue;
    const parent = byKey.get(`${m.round + 1}-${Math.floor(m.pos / 2)}`);
    if (!parent) continue;
    set.add(`${parent.id}:${m.pos % 2 === 0 ? "p1" : "p2"}`);
  }
  return set;
}

// Kelompokkan match per babak, terurut.
export function roundsOf(matches) {
  const map = new Map();
  for (const m of matches) {
    if (!map.has(m.round)) map.set(m.round, []);
    map.get(m.round).push(m);
  }
  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, list]) => ({ round, matches: list.sort((a, b) => a.pos - b.pos) }));
}

// Nama babak berdasarkan jaraknya ke final (0 = final, 1 = semifinal, ...).
export function roundLabel(round, totalRounds) {
  const d = totalRounds - round;
  return { 0: "Final", 1: "Semifinal", 2: "Perempat Final", 3: "16 Besar", 4: "32 Besar" }[d] || `Babak ${d + 1}`;
}
