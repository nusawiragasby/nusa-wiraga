import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, GitFork, ListOrdered, Pencil, ArrowLeft, Crown, Users, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatApiError } from "@/lib/api";
import { generateMatches, propagate, roundsOf, roundLabel, derivedSlots } from "@/lib/bracket";

const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500";
const selCls = "h-8 w-full rounded-md border border-[#2E2E3A] bg-[#0B0B0E] px-2 text-xs text-slate-100 outline-none focus:ring-1 focus:ring-amber-500";
const uid = () => (crypto?.randomUUID?.() || `m-${Date.now()}-${Math.random().toString(16).slice(2)}`);

const CATEGORIES = ["Tanding Putra", "Tanding Putri", "Seni Tunggal Putra", "Seni Tunggal Putri", "Seni Ganda", "Berkelompok (Jurus Baku)"];
const AGE_CLASSES = ["Usia Dini (7-11 Thn)", "Pra Remaja (12-14 Thn)"];
const WEIGHT_CLASSES = ["Kelas A (39-43 kg)", "Kelas B (43-47 kg)", "Kelas C (47-51 kg)", "Kelas D (51-55 kg)", "Kelas E (55-59 kg)", "Kelas F (59-63 kg)", "Bebas (>63 kg)"];

// Label atlet untuk ditaruh di slot bagan (nama + kontingen).
const athleteLabel = (a) =>
  `${a.member_names?.length ? a.member_names.join(" & ") : a.full_name} (${a.contingent_school})`;

// Slot dengan dropdown pilih atlet terverifikasi (tanpa ketik) + tombol pemenang.
const SlotSelect = ({ value, options, won, onPick, onChange }) => (
  <div className="flex items-center gap-1">
    <select value={value} onChange={(e) => onChange(e.target.value)} className={selCls}>
      <option value="">— Kosong / Bye —</option>
      {value && !options.includes(value) && <option value={value}>{value}</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
    <button type="button" onClick={onPick} aria-label="Tandai pemenang"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
        won ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-[#2E2E3A] text-slate-500 hover:text-amber-400"}`}>
      <Crown className="h-3.5 w-3.5" />
    </button>
  </div>
);

// Slot turunan (babak lanjutan) — read-only, terisi dari pemenang.
const SlotStatic = ({ value, won, onPick }) => (
  <div className="flex items-center gap-1">
    <span className="flex-1 truncate px-2 text-xs text-slate-300">{value || <span className="text-slate-600">—</span>}</span>
    <button type="button" onClick={onPick} aria-label="Tandai pemenang"
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
        won ? "border-amber-500 bg-amber-500/20 text-amber-300" : "border-[#2E2E3A] text-slate-500 hover:text-amber-400"}`}>
      <Crown className="h-3.5 w-3.5" />
    </button>
  </div>
);

const MatchEditor = ({ m, p1Editable, p2Editable, options, onChange }) => (
  <div className="rounded-xl border border-[#2E2E3A] bg-[#13131A] p-2" data-testid={`edit-match-${m.id}`}>
    {p1Editable
      ? <SlotSelect value={m.p1} options={options} won={m.winner === 1}
          onPick={() => onChange({ winner: m.winner === 1 ? null : 1 })} onChange={(v) => onChange({ p1: v })} />
      : <SlotStatic value={m.p1} won={m.winner === 1} onPick={() => onChange({ winner: m.winner === 1 ? null : 1 })} />}
    <div className="my-1 border-t border-[#2E2E3A]" />
    {p2Editable
      ? <SlotSelect value={m.p2} options={options} won={m.winner === 2}
          onPick={() => onChange({ winner: m.winner === 2 ? null : 2 })} onChange={(v) => onChange({ p2: v })} />
      : <SlotStatic value={m.p2} won={m.winner === 2} onPick={() => onChange({ winner: m.winner === 2 ? null : 2 })} />}
    <div className="mt-1.5 flex gap-1.5">
      <input value={m.schedule} onChange={(e) => onChange({ schedule: e.target.value })} placeholder="Jadwal"
        className="h-7 w-1/2 rounded-md border border-[#2E2E3A] bg-[#0B0B0E] px-2 text-[11px] text-slate-300 outline-none focus:ring-1 focus:ring-amber-500" />
      <input value={m.score} onChange={(e) => onChange({ score: e.target.value })} placeholder="Skor"
        className="h-7 w-1/2 rounded-md border border-[#2E2E3A] bg-[#0B0B0E] px-2 text-[11px] text-slate-300 outline-none focus:ring-1 focus:ring-amber-500" />
    </div>
  </div>
);

// Baris filter + tombol ambil dari pendaftar (dipakai bracket & list).
const AutofillBar = ({ fCat, setFCat, fAge, setFAge, fWeight, setFWeight, count, onFill, label }) => {
  const showWeight = fCat === "" || fCat.includes("Tanding");
  return (
    <div className="mb-4 rounded-xl border border-amber-500/20 bg-[#13131A] p-3" data-testid="bracket-autofill">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300"><Users className="h-3.5 w-3.5" /> Ambil dari pendaftar terverifikasi</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={fCat} onChange={(e) => setFCat(e.target.value)} className={`${selCls} w-auto`} data-testid="autofill-cat">
          <option value="">Semua Kategori</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={fAge} onChange={(e) => setFAge(e.target.value)} className={`${selCls} w-auto`} data-testid="autofill-age">
          <option value="">Semua Usia</option>
          {AGE_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {showWeight && (
          <select value={fWeight} onChange={(e) => setFWeight(e.target.value)} className={`${selCls} w-auto`} data-testid="autofill-weight">
            <option value="">Semua Kelas</option>
            {WEIGHT_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <Button type="button" onClick={onFill} disabled={count === 0} data-testid="autofill-btn"
          className="h-8 rounded-lg bg-amber-500 text-xs font-bold text-stone-900 hover:opacity-90 disabled:opacity-40">
          <Download className="h-3.5 w-3.5" /> {label} ({count})
        </Button>
      </div>
    </div>
  );
};

const BracketEditor = ({ draft, setDraft, options, filter }) => {
  const derived = useMemo(() => derivedSlots(draft.matches), [draft.matches]);
  // Daftar slot manual (yang perlu diisi admin/auto-fill), urut babak lalu posisi.
  const manualSlots = useMemo(() => {
    const list = [];
    for (const m of [...draft.matches].sort((a, b) => a.round - b.round || a.pos - b.pos)) {
      if (!derived.has(`${m.id}:p1`)) list.push({ id: m.id, slot: "p1" });
      if (!derived.has(`${m.id}:p2`)) list.push({ id: m.id, slot: "p2" });
    }
    return list;
  }, [draft.matches, derived]);

  const updateMatch = (id, patch) => {
    const matches = propagate(draft.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    setDraft({ ...draft, matches });
  };
  const autofill = () => {
    const picks = filter.list.map(athleteLabel);
    const byId = new Map(draft.matches.map((m) => [m.id, { ...m, winner: null }]));
    manualSlots.forEach((s, i) => { byId.get(s.id)[s.slot] = picks[i] || ""; });
    const matches = propagate([...byId.values()]);
    setDraft({ ...draft, matches });
    const cap = manualSlots.length;
    const used = Math.min(picks.length, cap);
    toast.success(`${used} atlet dimasukkan${picks.length > cap ? ` (${picks.length - cap} sisa tak muat, perbesar ukuran bagan)` : ""}`);
  };
  const rounds = roundsOf(draft.matches);
  return (
    <>
      <AutofillBar {...filter} count={filter.list.length} onFill={autofill} label="Isi Bagan" />
      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {rounds.map(({ round, matches: rm }) => (
            <div key={round} className="flex w-56 flex-col">
              <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-amber-400">{roundLabel(round, rounds.length)}</p>
              <div className="flex flex-1 flex-col justify-around gap-3">
                {rm.map((m) => (
                  <MatchEditor key={m.id} m={m} options={options}
                    p1Editable={!derived.has(`${m.id}:p1`)} p2Editable={!derived.has(`${m.id}:p2`)}
                    onChange={(patch) => updateMatch(m.id, patch)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

const ListEditor = ({ draft, setDraft, options, filter }) => {
  const updateMatch = (id, patch) => setDraft({ ...draft, matches: draft.matches.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  const addRow = () => setDraft({ ...draft, matches: [...draft.matches, { id: uid(), round: 1, pos: draft.matches.length, p1: "", p2: "", winner: null, score: "", schedule: "" }] });
  const removeRow = (id) => setDraft({ ...draft, matches: draft.matches.filter((m) => m.id !== id) });
  const autofill = () => {
    const rows = filter.list.map((a, i) => ({ id: uid(), round: 1, pos: draft.matches.length + i, p1: athleteLabel(a), p2: "", winner: null, score: "", schedule: "" }));
    setDraft({ ...draft, matches: [...draft.matches, ...rows] });
    toast.success(`${rows.length} atlet ditambahkan sebagai baris`);
  };
  return (
    <>
      <AutofillBar {...filter} count={filter.list.length} onFill={autofill} label="Tambah Baris" />
      <div className="space-y-2">
        {draft.matches.length === 0 && <p className="rounded-xl border border-dashed border-[#2E2E3A] p-6 text-center text-xs text-slate-500">Belum ada pertandingan. Ambil dari pendaftar di atas, atau klik "Tambah Pertandingan".</p>}
        {draft.matches.map((m) => (
          <div key={m.id} className="rounded-xl border border-[#2E2E3A] bg-[#13131A] p-2" data-testid={`edit-listrow-${m.id}`}>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <SlotSelect value={m.p1} options={options} won={m.winner === 1}
                onPick={() => updateMatch(m.id, { winner: m.winner === 1 ? null : 1 })} onChange={(v) => updateMatch(m.id, { p1: v })} />
              <SlotSelect value={m.p2} options={options} won={m.winner === 2}
                onPick={() => updateMatch(m.id, { winner: m.winner === 2 ? null : 2 })} onChange={(v) => updateMatch(m.id, { p2: v })} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5">
              <input value={m.schedule} onChange={(e) => updateMatch(m.id, { schedule: e.target.value })} placeholder="Jadwal / gelanggang"
                className="h-7 flex-1 rounded-md border border-[#2E2E3A] bg-[#0B0B0E] px-2 text-[11px] text-slate-300 outline-none focus:ring-1 focus:ring-amber-500" />
              <input value={m.score} onChange={(e) => updateMatch(m.id, { score: e.target.value })} placeholder="Skor / nilai"
                className="h-7 w-28 rounded-md border border-[#2E2E3A] bg-[#0B0B0E] px-2 text-[11px] text-slate-300 outline-none focus:ring-1 focus:ring-amber-500" />
              <button type="button" onClick={() => removeRow(m.id)} aria-label="Hapus baris"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2E2E3A] text-red-400 hover:bg-[#1C1C24]"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        ))}
        <Button type="button" onClick={addRow} data-testid="bracket-addrow-btn"
          className="w-full rounded-xl border border-dashed border-[#2E2E3A] bg-transparent text-sm text-slate-300 hover:border-amber-500/40 hover:bg-[#13131A]">
          <Plus className="h-4 w-4" /> Tambah Pertandingan Kosong
        </Button>
      </div>
    </>
  );
};

export const BracketManager = () => {
  const [items, setItems] = useState([]);
  const [athletes, setAthletes] = useState([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("bracket");
  const [size, setSize] = useState("8");
  const [draft, setDraft] = useState(null); // bagan yang sedang diedit
  const [saving, setSaving] = useState(false);
  // filter "ambil dari pendaftar"
  const [fCat, setFCat] = useState("");
  const [fAge, setFAge] = useState("");
  const [fWeight, setFWeight] = useState("");

  const load = useCallback(() => {
    api.get("/brackets").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get("/admin/registrants", { params: { status: "terverifikasi" } })
      .then((r) => setAthletes(r.data)).catch(() => {});
  }, []);

  const options = useMemo(() => {
    const s = new Set();
    for (const a of athletes) s.add(athleteLabel(a));
    return [...s];
  }, [athletes]);

  const filteredAthletes = useMemo(() => athletes.filter((a) =>
    (!fCat || a.category === fCat) && (!fAge || a.age_class === fAge) && (!fWeight || a.weight_class === fWeight)
  ), [athletes, fCat, fAge, fWeight]);

  const filter = { fCat, setFCat, fAge, setFAge, fWeight, setFWeight, list: filteredAthletes };

  const startCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("Judul bagan wajib diisi");
    const body = {
      title: title.trim(), kind, order: items.length,
      size: kind === "bracket" ? Number(size) : null,
      matches: kind === "bracket" ? generateMatches(Number(size)) : [],
    };
    setSaving(true);
    try {
      const { data } = await api.post("/admin/brackets", body);
      toast.success("Bagan dibuat");
      setCreateOpen(false); setTitle("");
      setItems((prev) => [...prev, data]);
      setDraft(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setSaving(false); }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const { data } = await api.put(`/admin/brackets/${draft.id}`, {
        title: draft.title, kind: draft.kind, size: draft.size, matches: draft.matches, order: draft.order,
      });
      toast.success("Bagan disimpan");
      setItems((prev) => prev.map((b) => (b.id === data.id ? data : b)));
      setDraft(null);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally { setSaving(false); }
  };

  const remove = async (b) => {
    if (!window.confirm(`Hapus bagan "${b.title}"?`)) return;
    try {
      await api.delete(`/admin/brackets/${b.id}`);
      toast.success("Bagan dihapus");
      setItems((prev) => prev.filter((x) => x.id !== b.id));
    } catch (err) { toast.error(formatApiError(err)); }
  };

  // ---- Mode editor ----
  if (draft) {
    return (
      <div className="mt-6" data-testid="bracket-editor">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button onClick={() => setDraft(null)} className="flex items-center gap-1 text-sm text-slate-400 hover:text-amber-400">
            <ArrowLeft className="h-4 w-4" /> Kembali ke daftar
          </button>
          <Button onClick={saveDraft} disabled={saving} data-testid="bracket-save-btn"
            className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Bagan"}
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          <Label>Judul Bagan</Label>
          <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            data-testid="bracket-title-edit" className={inputCls} placeholder="cth: Tanding Putra Kelas A · Usia Dini" />
        </div>
        <p className="mt-3 text-xs text-slate-500">
          {draft.kind === "bracket"
            ? "Ambil atlet dari pendaftar (isi otomatis), atau pilih per slot lewat dropdown. Klik ikon mahkota untuk menandai pemenang — nama otomatis naik ke babak berikutnya."
            : "Ambil atlet dari pendaftar, atau tambah baris manual. Tiap slot dipilih dari dropdown; untuk Seni Tunggal, kolom lawan boleh dikosongkan."}
        </p>
        <div className="mt-4">
          {draft.kind === "bracket"
            ? <BracketEditor draft={draft} setDraft={setDraft} options={options} filter={filter} />
            : <ListEditor draft={draft} setDraft={setDraft} options={options} filter={filter} />}
        </div>
      </div>
    );
  }

  // ---- Mode daftar ----
  return (
    <div className="mt-6" data-testid="bracket-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Bagan Pertandingan ({items.length})</h2>
        <Button onClick={() => setCreateOpen(true)} data-testid="admin-bracket-add-btn"
          className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
          <Plus className="h-4 w-4" /> Buat Bagan
        </Button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Bagan yang dibuat akan tampil di beranda publik pada bagian "Bagan Pertandingan". Slot diisi dari data pendaftar terverifikasi.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2E2E3A] p-10 text-center text-sm text-slate-500 sm:col-span-2" data-testid="bracket-empty">
            Belum ada bagan. Buat bagan gugur (Tanding) atau daftar pertandingan (Seni).
          </div>
        )}
        {items.map((b) => (
          <div key={b.id} data-testid={`admin-bracket-item-${b.id}`}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#2E2E3A] bg-[#13131A] p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#800E19]/40 text-amber-400">
                {b.kind === "bracket" ? <GitFork className="h-5 w-5" /> : <ListOrdered className="h-5 w-5" />}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold">{b.title}</h3>
                <p className="text-xs text-slate-500">
                  {b.kind === "bracket" ? `Bagan gugur · ${b.size} peserta` : `Daftar · ${b.matches.length} pertandingan`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={() => setDraft(b)} data-testid={`admin-bracket-edit-${b.id}`} aria-label="Atur bagan"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-slate-300 hover:bg-[#1C1C24]"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(b)} data-testid={`admin-bracket-delete-${b.id}`} aria-label="Hapus bagan"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-red-400 hover:bg-[#1C1C24]"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="bracket-create-dialog">
          <DialogHeader><DialogTitle className="font-display">Buat Bagan Baru</DialogTitle></DialogHeader>
          <form onSubmit={startCreate} className="space-y-4" data-testid="bracket-create-form">
            <div className="space-y-2">
              <Label>Judul Bagan</Label>
              <Input required value={title} onChange={(e) => setTitle(e.target.value)}
                data-testid="bracket-title-input" className={inputCls} placeholder="cth: Tanding Putra Kelas A · Usia Dini" />
            </div>
            <div className="space-y-2">
              <Label>Jenis</Label>
              <Select value={kind} onValueChange={setKind}>
                <SelectTrigger data-testid="bracket-kind-select" className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                  <SelectItem value="bracket">Bagan gugur tunggal (Tanding)</SelectItem>
                  <SelectItem value="list">Daftar pertandingan (Seni)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {kind === "bracket" && (
              <div className="space-y-2">
                <Label>Jumlah Peserta</Label>
                <Select value={size} onValueChange={setSize}>
                  <SelectTrigger data-testid="bracket-size-select" className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {["2", "3", "4", "8", "16", "32"].map((s) => <SelectItem key={s} value={s}>{s} peserta</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button type="submit" disabled={saving} data-testid="bracket-create-btn"
              className="w-full rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buat & Atur"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
