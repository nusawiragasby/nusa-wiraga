import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Medal, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatApiError } from "@/lib/api";

const CATEGORIES = ["Tanding Putra", "Tanding Putri", "Seni Tunggal Putra", "Seni Tunggal Putri", "Seni Ganda", "Berkelompok (Jurus Baku)"];
const MEDALS = [
  { value: "emas", label: "Emas", cls: "border-amber-500/40 bg-amber-500/15 text-amber-400" },
  { value: "perak", label: "Perak", cls: "border-slate-400/40 bg-slate-400/15 text-slate-300" },
  { value: "perunggu", label: "Perunggu", cls: "border-orange-700/40 bg-orange-700/15 text-orange-400" },
];
const EMPTY = { category: "Tanding Putra", division: "", athlete: "", contingent: "", medal: "emas" };
const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500";

export const ResultsManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/results").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (r) => { setEditing(r); setForm({ category: r.category, division: r.division, athlete: r.athlete, contingent: r.contingent, medal: r.medal }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/results/${editing.id}`, form);
      else await api.post("/admin/results", form);
      toast.success("Data juara disimpan");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Hapus data juara "${r.athlete}"?`)) return;
    try {
      await api.delete(`/admin/results/${r.id}`);
      toast.success("Data juara dihapus");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const medalOf = (m) => MEDALS.find((x) => x.value === m) || MEDALS[0];

  return (
    <div className="mt-6" data-testid="results-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Data Juara & Medali ({items.length})</h2>
        <Button onClick={openNew} data-testid="admin-result-add-btn"
          className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
          <Plus className="h-4 w-4" /> Input Juara
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2E2E3A] p-10 text-center text-sm text-slate-500" data-testid="results-empty">
            Belum ada data juara. Input di sini saat kejuaraan berlangsung — otomatis tampil di beranda.
          </div>
        )}
        {items.map((r) => (
          <div key={r.id} data-testid={`admin-result-item-${r.id}`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[#2E2E3A] bg-[#13131A] p-5">
            <div className="flex items-center gap-4">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${medalOf(r.medal).cls}`}>
                <Medal className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold sm:text-base">{r.athlete} <span className="text-slate-500 font-normal">— {r.contingent}</span></h3>
                <p className="mt-0.5 text-xs text-slate-400">{r.category} · {r.division} · <span className="font-semibold text-amber-400">{medalOf(r.medal).label}</span></p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => openEdit(r)} data-testid={`admin-result-edit-${r.id}`} aria-label="Ubah juara"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-amber-400 hover:bg-[#1C1C24]">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(r)} data-testid={`admin-result-delete-${r.id}`} aria-label="Hapus juara"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-red-400 hover:bg-[#1C1C24]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="result-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Ubah Data Juara" : "Input Juara Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" data-testid="result-form">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger data-testid="result-category-select" className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Medali</Label>
                <Select value={form.medal} onValueChange={(v) => setForm({ ...form, medal: v })}>
                  <SelectTrigger data-testid="result-medal-select" className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {MEDALS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Divisi / Kelas</Label>
              <Input required value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })}
                data-testid="result-division-input" className={inputCls} placeholder="cth: Kelas C Dewasa / Seni Tunggal Remaja" />
            </div>
            <div className="space-y-2">
              <Label>Nama Atlet / Regu</Label>
              <Input required value={form.athlete} onChange={(e) => setForm({ ...form, athlete: e.target.value })}
                data-testid="result-athlete-input" className={inputCls} placeholder="cth: Bima Sakti Pratama" />
            </div>
            <div className="space-y-2">
              <Label>Perguruan / Kontingen</Label>
              <Input required value={form.contingent} onChange={(e) => setForm({ ...form, contingent: e.target.value })}
                data-testid="result-contingent-input" className={inputCls} placeholder="cth: PS Macan Nusantara" />
            </div>
            <Button type="submit" disabled={saving} data-testid="result-save-btn"
              className="w-full rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Data Juara"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
