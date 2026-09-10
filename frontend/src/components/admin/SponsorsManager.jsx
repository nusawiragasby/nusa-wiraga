import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Upload, Crown, Medal as MedalIcon, Newspaper } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, formatApiError } from "@/lib/api";

const TIERS = [
  { value: "platinum", label: "Sponsor Utama (Platinum)", icon: Crown },
  { value: "gold", label: "Mitra Pendukung (Gold)", icon: MedalIcon },
  { value: "media", label: "Official Media Partner", icon: Newspaper },
];
const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500";

export const SponsorsManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tier, setTier] = useState("platinum");
  const [logo, setLogo] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    api.get("/sponsors").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("File harus berupa gambar (PNG/JPG/SVG)");
    if (file.size > 500 * 1024) return toast.error("Ukuran logo maksimal 500 KB");
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!logo) return toast.error("Pilih file logo terlebih dahulu");
    setSaving(true);
    try {
      await api.post("/admin/sponsors", { name, tier, logo_data: logo });
      toast.success("Sponsor ditambahkan");
      setOpen(false);
      setName(""); setLogo("");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`Hapus sponsor "${s.name}"?`)) return;
    try {
      await api.delete(`/admin/sponsors/${s.id}`);
      toast.success("Sponsor dihapus");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="mt-6" data-testid="sponsors-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Logo Sponsor ({items.length})</h2>
        <Button onClick={() => setOpen(true)} data-testid="admin-sponsor-add-btn"
          className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
          <Plus className="h-4 w-4" /> Tambah Sponsor
        </Button>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2E2E3A] p-10 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3" data-testid="sponsors-empty">
            Belum ada sponsor. Logo yang ditambahkan akan menggantikan slot placeholder di beranda.
          </div>
        )}
        {items.map((s) => {
          const t = TIERS.find((x) => x.value === s.tier) || TIERS[0];
          return (
            <div key={s.id} data-testid={`admin-sponsor-item-${s.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#2E2E3A] bg-[#13131A] p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-14 w-20 items-center justify-center rounded-xl bg-white p-2">
                  <img src={s.logo_data} alt={`Logo ${s.name}`} className="max-h-10 max-w-full object-contain" />
                </span>
                <div>
                  <h3 className="text-sm font-bold">{s.name}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-400"><t.icon className="h-3 w-3" /> {t.label}</p>
                </div>
              </div>
              <button onClick={() => remove(s)} data-testid={`admin-sponsor-delete-${s.id}`} aria-label="Hapus sponsor"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2E2E3A] text-red-400 hover:bg-[#1C1C24]">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="sponsor-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Sponsor</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" data-testid="sponsor-form">
            <div className="space-y-2">
              <Label>Nama Sponsor</Label>
              <Input required value={name} onChange={(e) => setName(e.target.value)}
                data-testid="sponsor-name-input" className={inputCls} placeholder="cth: PT Energi Nusantara" />
            </div>
            <div className="space-y-2">
              <Label>Tier Sponsor</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger data-testid="sponsor-tier-select" className={inputCls}><SelectValue /></SelectTrigger>
                <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                  {TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Logo (maks 500 KB, PNG/JPG/SVG)</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" data-testid="sponsor-logo-input" />
              <button type="button" onClick={() => fileRef.current?.click()} data-testid="sponsor-logo-picker"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2E2E3A] bg-[#0B0B0E] px-4 py-6 text-sm text-slate-400 hover:border-amber-500/40">
                {logo ? <img src={logo} alt="Pratinjau logo" className="max-h-16 object-contain" /> : <><Upload className="h-4 w-4" /> Pilih File Logo</>}
              </button>
            </div>
            <Button type="submit" disabled={saving} data-testid="sponsor-save-btn"
              className="w-full rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Sponsor"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
