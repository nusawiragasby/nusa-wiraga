import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, CalendarDays, MapPin } from "lucide-react";
import { ContactPanitia } from "@/components/ContactPanitia";

const TARGET = new Date("2026-10-10T08:00:00+07:00").getTime();
const HERO_IMG = "/hero-pagarnusa.jpg";

const useCountdown = () => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, TARGET - now);
  return {
    hari: Math.floor(diff / 86400000),
    jam: Math.floor((diff / 3600000) % 24),
    menit: Math.floor((diff / 60000) % 60),
    detik: Math.floor((diff / 1000) % 60),
  };
};

export const Hero = () => {
  const cd = useCountdown();
  return (
    <section id="beranda" className="relative overflow-hidden grain" data-testid="hero-section">
      <img src={HERO_IMG} alt="Barisan Pagar Nusa dalam upacara pembukaan kejuaraan pencak silat" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 hero-overlay" />
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
        <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
          Kejuaraan Tahunan &bull; Edisi ke-3
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="mt-4 max-w-3xl text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl lg:text-6xl">
          Kejuaraan Pencak Silat <span className="text-gold-gradient">Nusa Wiraga 2026</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="mt-6 max-w-xl text-base text-slate-300 sm:text-lg">
          Dua Hari Penuh Aksi Para Pendekar Nusantara. Uji Tangkas, Junjung Satria, Raih Tahta Juara.
        </motion.p>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-300">
          <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-amber-400" /> 10 - 11 Oktober 2026</span>
          <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-amber-400" /> Kaza Mall, Surabaya</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="mt-8 flex flex-wrap gap-3" data-testid="hero-countdown">
          {[["Hari", cd.hari], ["Jam", cd.jam], ["Menit", cd.menit], ["Detik", cd.detik]].map(([label, val]) => (
            <div key={label} className="w-20 rounded-2xl border border-amber-500/30 bg-[#13131A]/80 py-3 text-center backdrop-blur">
              <div className="font-display text-2xl font-extrabold text-amber-400">{String(val).padStart(2, "0")}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="mt-10 flex flex-wrap gap-4">
          <Link to="/daftar" data-testid="hero-register-cta"
            className="rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 px-8 py-4 font-display text-base font-extrabold text-stone-900 transition-transform hover:scale-105 glow-gold">
            Formulir Pendaftaran Online
          </Link>
          <ContactPanitia
            message="Halo Panitia Nusa Wiraga, saya ingin bertanya seputar pendaftaran."
            testId="hero-whatsapp-cta"
            className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-[#13131A]/60 px-6 py-4 font-display text-base font-bold text-amber-300 backdrop-blur transition-colors hover:bg-[#800E19]/40">
            <MessageCircle className="h-5 w-5" /> Hubungi Panitia
          </ContactPanitia>
        </motion.div>
      </div>
    </section>
  );
};
