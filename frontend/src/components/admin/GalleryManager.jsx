import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, API_BASE, formatApiError } from "@/lib/api";

const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 focus-visible:ring-amber-500";

export const GalleryManager = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(() => {
    api.get("/gallery").then((r) => setItems(r.data)).catch((e) => toast.error(formatApiError(e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  const pickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("File harus berupa gambar (JPG/PNG/WEBP)");
    if (f.size > 5 * 1024 * 1024) return toast.error("Ukuran gambar maksimal 5 MB");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const reset = () => { setCaption(""); setFile(null); setPreview(""); };

  const save = async (e) => {
    e.preventDefault();
    if (!file) return toast.error("Pilih file gambar terlebih dahulu");
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("caption", caption);
      await api.post("/admin/gallery", fd);
      toast.success("Foto galeri ditambahkan");
      setOpen(false);
      reset();
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Hapus foto ini dari galeri?")) return;
    try {
      await api.delete(`/admin/gallery/${item.id}`);
      toast.success("Foto galeri dihapus");
      load();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="mt-6" data-testid="gallery-manager">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Foto Galeri ({items.length})</h2>
        <Button onClick={() => setOpen(true)} data-testid="admin-gallery-add-btn"
          className="rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
          <Plus className="h-4 w-4" /> Tambah Foto
        </Button>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Selama belum ada foto, beranda menampilkan foto contoh. Begitu Anda menambahkan foto, galeri beranda memakai foto Anda.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#2E2E3A] p-10 text-center text-sm text-slate-500 sm:col-span-2 lg:col-span-3" data-testid="gallery-empty">
            Belum ada foto galeri.
          </div>
        )}
        {items.map((item) => (
          <div key={item.id} data-testid={`admin-gallery-item-${item.id}`}
            className="group relative overflow-hidden rounded-2xl border border-[#2E2E3A] bg-[#13131A]">
            <img src={`${API_BASE}/gallery/${item.id}/image`} alt={item.caption || "Foto galeri"}
              className="h-44 w-full object-cover" loading="lazy" />
            {item.caption && (
              <p className="px-3 py-2 text-xs text-slate-300">{item.caption}</p>
            )}
            <button onClick={() => remove(item)} data-testid={`admin-gallery-delete-${item.id}`} aria-label="Hapus foto"
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg border border-[#2E2E3A] bg-[#0B0B0E]/80 text-red-400 hover:bg-[#1C1C24]">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="gallery-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Foto Galeri</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4" data-testid="gallery-form">
            <div className="space-y-2">
              <Label>Keterangan (opsional)</Label>
              <Input value={caption} onChange={(e) => setCaption(e.target.value)}
                data-testid="gallery-caption-input" className={inputCls} placeholder="cth: Duel final kelas C putra" />
            </div>
            <div className="space-y-2">
              <Label>Foto (maks 5 MB, JPG/PNG/WEBP)</Label>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" data-testid="gallery-file-input" />
              <button type="button" onClick={() => fileRef.current?.click()} data-testid="gallery-file-picker"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#2E2E3A] bg-[#0B0B0E] px-4 py-6 text-sm text-slate-400 hover:border-amber-500/40">
                {preview ? <img src={preview} alt="Pratinjau foto" className="max-h-40 rounded-lg object-contain" /> : <><Upload className="h-4 w-4" /> Pilih File Foto</>}
              </button>
            </div>
            <Button type="submit" disabled={saving} data-testid="gallery-save-btn"
              className="w-full rounded-xl bg-amber-500 font-extrabold text-stone-900 hover:opacity-90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Foto"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
