import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, MessageCircle, Loader2, FileUp, Check } from "lucide-react";
import Seo from "@/components/Seo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { api, formatApiError } from "@/lib/api";
import { compressImage } from "@/lib/compressImage";
import { fileKindsFor, fileSetCount, memberCount, memberLabel } from "@/lib/registration";
import { ContactPanitia } from "@/components/ContactPanitia";

const CATEGORIES = ["Tanding Putra", "Tanding Putri", "Seni Tunggal Putra", "Seni Tunggal Putri", "Seni Ganda", "Berkelompok (Jurus Baku)"];
const AGE_CLASSES = ["Usia Dini (7-11 Thn)", "Pra Remaja (12-14 Thn)"];
const WEIGHT_CLASSES = ["Kelas A (39-43 kg)", "Kelas B (43-47 kg)", "Kelas C (47-51 kg)", "Kelas D (51-55 kg)", "Kelas E (55-59 kg)", "Kelas F (59-63 kg)", "Bebas (>63 kg)"];

const INITIAL = {
  full_name: "", contingent_school: "", category: "", age_class: "", weight_class: "", height_cm: "", official_coach: "",
};
const INITIAL_MEMBERS = ["", "", "", ""];
const inputCls = "border-[#2E2E3A] bg-[#0B0B0E] text-slate-100 placeholder:text-slate-500 focus-visible:ring-amber-500";

// Satu baris pendek, bukan kotak tinggi: kategori beregu memerlukan 15 slot
// dan versi lama membuat formulir memanjang jauh di layar ponsel.
function FileSlot({ field, file, onPick }) {
  return (
    <label data-testid={`reg-file-${field.key}-picker`}
      className={`flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-2.5 transition-colors ${
        file ? "border-amber-500/50 bg-amber-500/5" : "border-[#2E2E3A] bg-[#0B0B0E] hover:border-amber-500/40"}`}>
      {file ? <Check className="h-4 w-4 shrink-0 text-amber-400" /> : <FileUp className="h-4 w-4 shrink-0 text-amber-400" />}
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-300">{field.label}</span>
        <span className="block truncate text-[10px] text-slate-500" data-testid={`reg-file-${field.key}-name`}>
          {file ? file.name : field.hint}
        </span>
      </span>
      <input type="file" accept={field.accept} className="hidden" data-testid={`reg-file-${field.key}-input`} onChange={onPick} />
    </label>
  );
}

export default function RegisterPage() {
  const [form, setForm] = useState(INITIAL);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const isTanding = form.category.includes("Tanding");
  const groupSize = memberCount(form.category);
  const isGroup = groupSize > 0;
  // Satu set berkas (data diri, surat sehat, pas foto) per anggota.
  const setCount = fileSetCount(form.category);
  const fileFields = fileKindsFor(form.category);
  const memberNames = [form.full_name, ...members.slice(0, Math.max(groupSize - 1, 0))];
  const set = (k) => (e) => setForm({ ...form, [k]: e.target ? e.target.value : e });
  const setMember = (i) => (e) => setMembers(members.map((m, j) => (j === i ? e.target.value : m)));

  const pickFile = (key) => async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f);
    if (compressed.size > 5 * 1024 * 1024) return toast.error("Ukuran file maksimal 5 MB");
    setFiles({ ...files, [key]: compressed });
  };

  const submit = async (e) => {
    e.preventDefault();
    const missing = fileFields.filter((f) => !files[f.key]);
    if (missing.length > 0) {
      const name = (f) => (setCount > 1 ? `${memberLabel(f.member, setCount)}: ${f.label}` : f.label);
      const head = missing.slice(0, 3).map(name).join(", ");
      toast.error(`Berkas wajib belum lengkap (${missing.length}) — ${head}${missing.length > 3 ? ", dst." : ""}`);
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form };
      // Field kosong dibuang, bukan dikirim sebagai "": tinggi badan bertipe
      // angka di backend, dan string kosong ditolak Pydantic ("Input should be
      // a valid number") sehingga seluruh kategori non-Tanding gagal mendaftar.
      Object.keys(payload).forEach((k) => {
        if (typeof payload[k] === "string" && !payload[k].trim()) delete payload[k];
      });
      if (isGroup) payload.member_names = [form.full_name, ...members.slice(0, groupSize - 1)];
      const { data } = await api.post("/register", payload);
      try {
        // Hanya berkas yang relevan dengan kategori terpilih: foto anggota bisa
        // tertinggal di state bila pendaftar sempat memilih kategori beregu.
        const fd = new FormData();
        fileFields.forEach((f) => fd.append(f.key, files[f.key]));
        await api.post(`/register/${data.id}/files`, fd);
      } catch (uploadErr) {
        toast.warning(`Pendaftaran tersimpan, tetapi berkas gagal terunggah: ${formatApiError(uploadErr)}`);
      }
      setResult(data);
      toast.success("Pendaftaran berhasil dikirim!");
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-slate-50" data-testid="register-page">
      <Seo title="Pendaftaran Online — Nusa Wiraga 2026" siteName="Nusa Wiraga"
        description="Formulir pendaftaran online Kejuaraan Pencak Silat Nusa Wiraga 2026." />
      <div className="grid min-h-screen lg:grid-cols-5">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[#800E19] p-10 lg:col-span-2 lg:flex grain">
          <Link to="/" className="relative flex items-center gap-2" data-testid="register-logo">
            <img src="/logo-nusawiraga.png" alt="Logo Nusa Wiraga" className="h-9 w-9 rounded-xl object-cover" />
            <span className="font-display text-lg font-extrabold">NUSA <span className="text-gold-gradient">WIRAGA</span></span>
          </Link>
          <div className="relative">
            <h1 className="font-display text-3xl font-black uppercase leading-tight xl:text-4xl">
              Satu Langkah Menuju <span className="text-gold-gradient">Gelanggang Juara</span>
            </h1>
            <ol className="mt-8 space-y-4">
              {["Isi formulir data atlet & kontingen", "Panitia menghubungi via WhatsApp untuk pembayaran", "Verifikasi berkas & terbit nomor undian"].map((s, i) => (
                <li key={s} className="flex items-start gap-3 text-sm text-slate-200">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-extrabold text-stone-900">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <p className="relative text-xs text-slate-300">10 - 11 Oktober 2026 &bull; Kaza Mall, Surabaya</p>
        </aside>

        <main className="flex items-center justify-center px-4 py-12 lg:col-span-3 sm:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl">
            <Link to="/" className="text-sm text-slate-400 hover:text-amber-400" data-testid="register-back-link">&larr; Kembali ke Beranda</Link>
            <h2 className="mt-4 text-2xl font-extrabold tracking-tight sm:text-3xl">Formulir Pendaftaran Atlet</h2>
            <p className="mt-2 text-sm text-slate-400">Lengkapi data berikut. Panitia akan menghubungi kontingen Anda untuk verifikasi pembayaran & berkas.</p>
            <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2" data-testid="register-form">
              <div className="space-y-2">
                <Label htmlFor="full_name">{isGroup ? `Nama Anggota 1${groupSize === 5 ? " (Ketua Regu)" : ""}` : "Nama Lengkap Atlet"}</Label>
                <Input id="full_name" required data-testid="reg-fullname-input" className={inputCls}
                  value={form.full_name} onChange={set("full_name")} placeholder="cth: Bima Sakti Pratama" />
              </div>
              {isGroup && members.slice(0, groupSize - 1).map((m, i) => (
                <div className="space-y-2" key={i}>
                  <Label htmlFor={`member-${i + 2}`}>Nama Anggota {i + 2}</Label>
                  <Input id={`member-${i + 2}`} required data-testid={`reg-member-${i + 2}-input`} className={inputCls}
                    value={m} onChange={setMember(i)} placeholder={`cth: Nama anggota ${i + 2}`} />
                </div>
              ))}
              <div className="space-y-2">
                <Label htmlFor="school">Kontingen / Asal Sekolah</Label>
                <Input id="school" required data-testid="reg-contingent-input" className={inputCls}
                  value={form.contingent_school} onChange={set("contingent_school")} placeholder="cth: PS Macan Nusantara" />
              </div>
              <div className="space-y-2">
                <Label>Kategori Tanding / Seni</Label>
                <Select required value={form.category} onValueChange={set("category")}>
                  <SelectTrigger data-testid="reg-category-select" className={inputCls}><SelectValue placeholder="Pilih kategori" /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Kelompok Usia</Label>
                <Select required value={form.age_class} onValueChange={set("age_class")}>
                  <SelectTrigger data-testid="reg-age-select" className={inputCls}><SelectValue placeholder="Pilih kelompok usia" /></SelectTrigger>
                  <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                    {AGE_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isTanding && (
                <div className="space-y-2">
                  <Label>Kelas Tanding (Berat Badan)</Label>
                  <Select value={form.weight_class} onValueChange={set("weight_class")}>
                    <SelectTrigger data-testid="reg-weight-select" className={inputCls}><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent className="border-[#2E2E3A] bg-[#1C1C24] text-slate-100">
                      {WEIGHT_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isTanding && (
                <div className="space-y-2">
                  <Label htmlFor="height_cm">Tinggi Badan (cm)</Label>
                  <Input id="height_cm" type="number" min="100" max="220" required data-testid="reg-height-input" className={inputCls}
                    value={form.height_cm} onChange={set("height_cm")} placeholder="cth: 145" />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="coach">Nama Pelatih / Official (opsional)</Label>
                <Input id="coach" data-testid="reg-coach-input" className={inputCls}
                  value={form.official_coach} onChange={set("official_coach")} placeholder="cth: Guru H. Rahmat" />
              </div>
              <div className="space-y-3 sm:col-span-2">
                <Label>Berkas Pendukung <span className="text-amber-400">(wajib)</span> — PDF/JPG/PNG, maks 5 MB per berkas</Label>
                {!isGroup ? (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {fileFields.map((f) => (
                      <FileSlot key={f.key} field={f} file={files[f.key]} onPick={pickFile(f.key)} />
                    ))}
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-400" data-testid="reg-files-hint">
                      Tiap anggota melampirkan 3 berkas sendiri ({groupSize * 3} berkas). Ketuk nama anggota untuk membukanya.
                    </p>
                    <Accordion type="multiple" defaultValue={["m0"]}
                      className="overflow-hidden rounded-xl border border-[#2E2E3A] bg-[#0B0B0E]">
                      {Array.from({ length: groupSize }, (_, i) => {
                        const fields = fileFields.filter((f) => f.member === i);
                        const done = fields.filter((f) => files[f.key]).length;
                        return (
                          <AccordionItem key={i} value={`m${i}`} className="border-[#2E2E3A] px-3 last:border-b-0">
                            <AccordionTrigger className="py-3 hover:no-underline" data-testid={`reg-member-files-${i + 1}`}>
                              <span className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                                <span className="shrink-0 text-xs font-bold text-slate-200">{memberLabel(i, groupSize)}</span>
                                <span className="min-w-0 truncate text-xs text-slate-500">
                                  {memberNames[i]?.trim() || "nama belum diisi"}
                                </span>
                              </span>
                              <span data-testid={`reg-member-files-${i + 1}-count`}
                                className={`mr-2 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                                  done === fields.length ? "bg-amber-500 text-stone-900" : "bg-[#1C1C24] text-slate-400"}`}>
                                {done}/{fields.length}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3">
                              <div className="grid gap-2 sm:grid-cols-3">
                                {fields.map((f) => (
                                  <FileSlot key={f.key} field={f} file={files[f.key]} onPick={pickFile(f.key)} />
                                ))}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </>
                )}
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={loading} data-testid="reg-submit-btn"
                  className="h-12 w-full rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 font-display text-base font-extrabold text-stone-900 hover:opacity-90">
                  {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Mengirim...</> : "Kirim Pendaftaran"}
                </Button>
              </div>
            </form>
          </motion.div>
        </main>
      </div>

      <Dialog open={!!result} onOpenChange={() => setResult(null)}>
        <DialogContent className="border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="reg-success-modal">
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15">
              <CheckCircle2 className="h-8 w-8 text-amber-400" />
            </div>
            <DialogTitle className="text-center font-display text-xl">Pendaftaran Berhasil Dikirim!</DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              Nomor registrasi unik Anda telah dibuat. Simpan nomor ini — panitia akan
              menghubungi kontingen Anda untuk verifikasi pembayaran & berkas.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-amber-500/30 bg-[#0B0B0E] p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-slate-500">Nomor Registrasi</p>
            <p className="mt-1 font-display text-3xl font-black text-amber-400" data-testid="reg-number-text">{result?.reg_number}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ContactPanitia
              message={`Halo Panitia Nusa Wiraga, saya ${form.full_name} (${result?.reg_number}) ingin konfirmasi pendaftaran.`}
              title="Konfirmasi ke Panitia"
              testId="reg-success-wa-btn"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-extrabold text-stone-900 hover:opacity-90">
              <MessageCircle className="h-4 w-4" /> Konfirmasi via WhatsApp
            </ContactPanitia>
            <Link to="/" data-testid="reg-success-home-btn"
              className="flex flex-1 items-center justify-center rounded-xl border border-[#2E2E3A] px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-[#1C1C24]">
              Kembali ke Beranda
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
