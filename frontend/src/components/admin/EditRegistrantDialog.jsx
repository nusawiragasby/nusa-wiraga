import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, formatApiError } from "@/lib/api";
import { AGE_CLASSES, CATEGORIES, MAX_MEMBERS, memberCount, minMemberCount, weightClassesFor } from "@/lib/registration";

const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-50";
const menuCls = "border-[#2E2E3A] bg-[#1C1C24] text-slate-100";

const isiAwal = (r) => ({
  contingent_school: r.contingent_school || "",
  category: r.category || "",
  age_class: r.age_class || "",
  weight_class: r.weight_class || "",
  height_cm: r.height_cm ?? "",
  official_coach: r.official_coach || "",
  // Nama atlet tunggal disimpan sebagai anggota pertama supaya berpindah ke
  // kategori ganda/beregu tidak perlu mengetik ulang.
  names: Array.from({ length: MAX_MEMBERS }, (_, i) => r.member_names?.[i] ?? (i === 0 ? r.full_name || "" : "")),
});

// Data lama bisa memakai nama kategori/kelas yang sudah tidak ada di daftar
// (mis. "Seni Ganda Putra" sebelum dipecah kosongan/senjata). Nilai itu tetap
// ditampilkan supaya admin melihatnya dan bisa memindahkannya ke yang baru.
const denganNilaiLama = (opsi, nilai) => (nilai && !opsi.includes(nilai) ? [nilai, ...opsi] : opsi);

export function EditRegistrantDialog({ registrant, onClose, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(registrant ? isiAwal(registrant) : null);
  }, [registrant]);

  if (!registrant || !form) return null;

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const setNama = (i, value) => setForm((f) => ({ ...f, names: f.names.map((n, j) => (j === i ? value : n)) }));
  const setAgeClass = (value) => setForm((f) => ({
    ...f, age_class: value,
    // Kelas berat bergantung pada kelompok usia; yang tidak berlaku dikosongkan.
    weight_class: weightClassesFor(value).includes(f.weight_class) ? f.weight_class : "",
  }));

  const isTanding = form.category.includes("Tanding");
  const groupSize = memberCount(form.category);
  const minAnggota = minMemberCount(form.category);
  const jumlahSlot = Math.max(groupSize, 1);
  const namaDipakai = form.names.slice(0, jumlahSlot).map((n) => n.trim());
  const namaTerisi = namaDipakai.filter(Boolean);
  const adaLubang = namaDipakai.some((n, i) => !n && namaDipakai.slice(i + 1).some(Boolean));
  const anggotaLama = Math.max(registrant.member_names?.length || 1, 1);
  const anggotaBaru = Math.max(groupSize ? namaTerisi.length : 1, 1);

  const save = async (e) => {
    e.preventDefault();
    if (!namaTerisi.length) return toast.error("Nama peserta wajib diisi.");
    if (groupSize && adaLubang) return toast.error("Isi nama anggota berurutan dari atas — jangan ada yang dilewati.");
    if (groupSize && namaTerisi.length < minAnggota) {
      return toast.error(`Kategori ${form.category} wajib diisi minimal ${minAnggota} nama anggota.`);
    }
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/registrants/${registrant.id}`, {
        full_name: namaTerisi[0],
        contingent_school: form.contingent_school,
        category: form.category,
        age_class: form.age_class,
        weight_class: isTanding ? form.weight_class : "",
        height_cm: isTanding ? form.height_cm : "",
        official_coach: form.official_coach,
        member_names: groupSize ? namaTerisi : [],
      });
      toast.success(`Data ${data.reg_number} diperbarui`);
      onSaved(data);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-[#2E2E3A] bg-[#13131A] text-slate-50" data-testid="admin-edit-modal">
        <DialogHeader>
          <DialogTitle className="font-display">Edit {registrant.reg_number}</DialogTitle>
          <DialogDescription className="text-slate-400">
            Perubahan langsung tersimpan dan ikut diperbarui di Google Sheets.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              <Select value={form.category} onValueChange={set("category")}>
                <SelectTrigger className={inputCls} data-testid="edit-category-select"><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                <SelectContent className={menuCls}>
                  {denganNilaiLama(CATEGORIES, registrant.category).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kelompok Usia</Label>
              <Select value={form.age_class} onValueChange={setAgeClass}>
                <SelectTrigger className={inputCls} data-testid="edit-age-select"><SelectValue placeholder="Pilih kelompok usia" /></SelectTrigger>
                <SelectContent className={menuCls}>
                  {denganNilaiLama(AGE_CLASSES, registrant.age_class).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isTanding && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Kelas Tanding</Label>
                <Select value={form.weight_class} onValueChange={set("weight_class")} disabled={!form.age_class}>
                  <SelectTrigger className={inputCls} data-testid="edit-weight-select">
                    <SelectValue placeholder={form.age_class ? "Pilih kelas" : "Pilih kelompok usia dulu"} />
                  </SelectTrigger>
                  <SelectContent className={menuCls}>
                    {weightClassesFor(form.age_class).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-height">Tinggi Badan (cm)</Label>
                <Input id="edit-height" type="number" min="80" max="220" required className={inputCls}
                  data-testid="edit-height-input" value={form.height_cm} onChange={(e) => set("height_cm")(e.target.value)} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>{groupSize ? `Nama Anggota (${minAnggota === groupSize ? groupSize : `${minAnggota}–${groupSize}`} orang)` : "Nama Atlet"}</Label>
            {Array.from({ length: jumlahSlot }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                {groupSize > 0 && <span className="w-4 shrink-0 text-right text-xs text-slate-500">{i + 1}</span>}
                <Input className={inputCls} value={form.names[i]} data-testid={`edit-name-input-${i}`}
                  required={i < Math.max(minAnggota, 1)} onChange={(e) => setNama(i, e.target.value)}
                  placeholder={i >= Math.max(minAnggota, 1) ? "(opsional)" : ""} />
              </div>
            ))}
            {anggotaBaru !== anggotaLama && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300" data-testid="edit-member-change-note">
                {anggotaBaru > anggotaLama
                  ? `Jumlah peserta bertambah menjadi ${anggotaBaru}. Unggah berkas anggota baru lewat tombol Berkas setelah disimpan.`
                  : `Jumlah peserta berkurang menjadi ${anggotaBaru}. Berkas anggota yang dikeluarkan disembunyikan, tidak dihapus.`}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-school">Perguruan / Sekolah</Label>
              <Input id="edit-school" required className={inputCls} data-testid="edit-school-input"
                value={form.contingent_school} onChange={(e) => set("contingent_school")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-coach">Pelatih / Official</Label>
              <Input id="edit-coach" className={inputCls} data-testid="edit-coach-input"
                value={form.official_coach} onChange={(e) => set("official_coach")(e.target.value)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving}
              className="rounded-lg border border-[#2E2E3A] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-[#1C1C24]">
              Batal
            </button>
            <button type="submit" disabled={saving} data-testid="edit-save-btn"
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-extrabold text-stone-900 disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Simpan
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
