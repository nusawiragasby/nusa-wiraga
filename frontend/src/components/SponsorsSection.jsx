import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Medal, Newspaper, MessageCircle } from "lucide-react";
import { api, waLink } from "@/lib/api";

const TIERS = [
  { key: "platinum", icon: Crown, tier: "Sponsor Utama (Platinum)", slots: 1 },
  { key: "gold", icon: Medal, tier: "Mitra Pendukung (Gold)", slots: 3 },
  { key: "media", icon: Newspaper, tier: "Official Media Partner", slots: 4 },
];

export const SponsorsSection = () => {
  const [sponsors, setSponsors] = useState([]);
  useEffect(() => {
    api.get("/sponsors").then((r) => setSponsors(r.data)).catch(() => {});
  }, []);

  return (
    <section id="sponsor" className="border-t border-[#2E2E3A] bg-[#13131A]/50 py-24" data-testid="sponsors-section">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Sponsor</p>
        <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
          Didukung & <span className="text-gold-gradient">Disponsori Oleh</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
          Sinergi bersama memajukan pencak silat Indonesia.
        </p>
        <div className="mt-12 space-y-8">
          {TIERS.map((t, i) => {
            const inTier = sponsors.filter((s) => s.tier === t.key);
            const emptySlots = Math.max(0, t.slots - inTier.length);
            return (
              <motion.div key={t.tier} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <h3 className="flex items-center gap-2 text-base font-bold text-amber-300 sm:text-lg">
                  <t.icon className="h-5 w-5" /> {t.tier}
                </h3>
                <div className={`mt-4 grid gap-4 ${t.slots === 1 ? "grid-cols-1" : t.slots === 3 ? "sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
                  {inTier.map((s) => (
                    <div key={s.id} data-testid={`sponsor-logo-${s.id}`}
                      className="flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border border-amber-500/20 bg-white p-3">
                      <img src={s.logo_data} alt={`Logo ${s.name}`} className="max-h-12 max-w-full object-contain" />
                      <span className="text-[10px] font-semibold text-stone-600">{s.name}</span>
                    </div>
                  ))}
                  {Array.from({ length: emptySlots }).map((_, j) => (
                    <div key={j} data-testid={`sponsor-slot-${i}-${j}`}
                      className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-[#2E2E3A] bg-[#1C1C24] text-xs font-semibold text-slate-500">
                      Ruang Logo Tersedia
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-[#800E19]/40 to-transparent p-6 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-lg font-bold">Jadilah Bagian dari Sejarah</h3>
          <p className="mt-1 max-w-xl text-sm text-slate-300">
            Buka peluang kemitraan brand Anda di hadapan ribuan pendekar dan penonton dari seluruh Nusantara.
          </p>
        </div>
        <a href={waLink("Halo Panitia Nusa Wiraga, kami tertarik menjadi sponsor kejuaraan 2026.")}
          target="_blank" rel="noopener noreferrer" data-testid="sponsor-contact-cta"
          className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 font-display text-sm font-extrabold text-stone-900 transition-transform hover:scale-105">
          <MessageCircle className="h-4 w-4" /> Ajukan Sponsorship
        </a>
      </div>
    </div>
    </section>
  );
};
