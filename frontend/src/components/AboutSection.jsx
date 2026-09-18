import { Reveal } from "@/components/Reveal";

export const AboutSection = () => (
  <section id="profil" className="mx-auto max-w-4xl px-4 py-24 sm:px-6" data-testid="about-section">
    <Reveal>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">Profil & Visi</p>
      <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
        Tentang <span className="text-gold-gradient">Nusa Wiraga</span>
      </h2>
      <p className="mt-2 text-base text-slate-400 sm:text-lg">Budayakan Prestasi, Prestasikan Budaya</p>
      <p className="mt-6 text-sm leading-relaxed text-slate-300 sm:text-base">
        Nusa Wiraga adalah gelanggang kejuaraan pencak silat tahunan bergengsi yang
        diselenggarakan selama dua hari penuh setiap tahunnya. Menghimpun aliran silat dari pelosok
        kepulauan Indonesia dalam semangat persaudaraan, integritas, dan keunggulan teknik bela diri
        bertaraf IPSI / PERSILAT.
      </p>
    </Reveal>
  </section>
);
