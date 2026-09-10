import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatApiError } from "@/lib/api";

const BADGES = ["Penting", "Regulasi", "Kontingen", "Umum"];
const EMPTY = { title: "", badge: "Umum", date: "", body: "" };
const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500";

export const NewsManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get("/news").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (n) => { setEditing(n); setForm({ title: n.title, badge: n.badge, date: n.date, body: n.body || "" }); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) await api.put(`/admin/news/${editing.id}`, form);
      else await api.post("/admin/news", form);
      toast.success("Berita disimpan");
      setOpen(false);
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (n) => {
    if (!window.confirm(`Hapus berita "${n.title}"?`)) return;
    try {
      await api.delete(`/admin/news/${n.id}`);
      toast.success("Berita dihapus");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="mt-6" data-testid="news-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Daftar Berita ({items.length})</h2>
        <Button onClick={openNew} data-testid="admin-news-add-btn"
          className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
          <Plus className="h-4 w-4" /> Tulis Berita
        </Button>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2E2E3A] p-10 text-center text-sm text-slate-500" data-testid="news-empty">
            Belum ada berita.
          </div>
        )}
        {items.map((n) => (
          <div key={n.id} data-testid={`admin-news-item-${n.id}`}
            className="flex items-start justify-between gap-4 rounded-2xl border border-[#2E2E3A] bg-[#13131A] p-5">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#800E19]/40">
                <Newspaper className="h-5 w-5 text-amber-400" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-400">{n.badge}</span>
                  <span className="text-xs text-slate-500">{n.date}</span>
                </div>
                <h3 className="mt-1.5 text-sm font-bold sm:text-base">{n.title}</h3>
                {n.body && <p className="mt-1 line-clamp-2 text-xs text-slate-400 sm:text-sm">{n.body}</p>}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => openEdit(n)} data-testid={`admin-news-edit-${n.id}`} aria-label="Ubah berita"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-amber-400 hover:bg-[#1C1C24]">
                <Pencil className="h-4 w-4" />
              </button>
              <button onClick={() => remove(n)} data-testid={`admin-news-delete-${n.id}`} aria-label="Hapus berita"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] text-red-400 hover:bg-[#1C1C24]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="news-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? "Ubah Berita" : "Tulis Berita Baru"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" data-testid="news-form">
            <div className="space-y-2">
              <Label>Judul Berita</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                data-testid="news-title-input" className={inputCls} placeholder="cth: Hasil Pengundian Bagan Tanding" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Select value={form.badge} onValueChange={(v) => setForm({ ...form, badge: v })}>
                  <SelectTrigger data-testid="news-badge-select" className={inputCls}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {BADGES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  data-testid="news-date-input" className={inputCls} placeholder="cth: 12 Oktober 2026" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Isi Berita</Label>
              <Textarea rows={5} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
                data-testid="news-body-input" className={inputCls} placeholder="Tulis isi pengumuman..." />
            </div>
            <Button type="submit" disabled={saving} data-testid="news-save-btn"
              className="w-full rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Berita"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
