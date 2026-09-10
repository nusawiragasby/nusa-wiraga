import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Swords, User, Users, Banknote } from "lucide-react";

const CATEGORIES = [
  { icon: Swords, name: "Tanding Putra / Putri", desc: "Kelas A - F dan Kelas Bebas, usia dini hingga dewasa.", fee: "Rp 175.000 / atlet" },
  { icon: User, name: "Seni Tunggal", desc: "Jurus wajib tunggal putra & putri dengan senjata.", fee: "Rp 175.000 / atlet" },
  { icon: Users, name: "Seni Ganda", desc: "Koreografi jurus berpasangan dengan serang bela.", fee: "Rp 175.000 / pasangan" },
  { icon: Users, name: "Seni Berkelompok (Jurus Baku)", desc: "Kekompakan regu dalam jurus baku.", fee: "Rp 175.000 / regu" },
];

export const CategoriesSection = () => (
  <section id="kategori" className="border-y border-[#2E2E3A] bg-[#13131A]/50 py-24" data-testid="categories-section">
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Kategori & Biaya</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
        Pilih Medan <span className="text-gold-gradient">Pengabdianmu</span>
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORIES.map((c, i) => (
          <motion.div key={c.name} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="group rounded-2xl border border-[#2E2E3A] bg-[#1C1C24] p-6 transition-all hover:-translate-y-2 hover:border-amber-500/40"
            data-testid={`category-card-${i}`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#800E19]/40 transition-colors group-hover:bg-[#800E19]">
              <c.icon className="h-6 w-6 text-amber-400" />
            </span>
            <h3 className="mt-5 text-lg font-bold sm:text-xl">{c.name}</h3>
            <p className="mt-2 text-sm text-slate-400">{c.desc}</p>
            <p className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-400">
              <Banknote className="h-4 w-4" /> {c.fee}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#800E19]/40 to-transparent p-6 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold">Pembayaran & Verifikasi</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            Setelah mendaftar, panitia akan menghubungi Anda via WhatsApp untuk instruksi pembayaran
            dan verifikasi berkas (KK/ijazah, pas foto, dan surat keterangan perguruan).
          </p>
        </div>
        <Link to="/daftar" data-testid="categories-register-cta"
          className="shrink-0 rounded-xl bg-amber-500 px-6 py-3 font-display text-sm font-extrabold text-stone-900 transition-transform hover:scale-105">
          Daftar Sekarang
        </Link>
      </div>
    </div>
  </section>
);
