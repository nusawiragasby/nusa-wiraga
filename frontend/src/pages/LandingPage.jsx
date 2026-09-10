import Seo from "@/components/Seo";
import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { AboutSection } from "@/components/AboutSection";
import { CategoriesSection } from "@/components/CategoriesSection";
import { BracketSection } from "@/components/BracketSection";
import { ResultsSection } from "@/components/ResultsSection";
import { SponsorsSection } from "@/components/SponsorsSection";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0B0B0E] text-slate-50" data-testid="landing-page">
      <Seo
        title="Nusa Wiraga 2026 — Kejuaraan Pencak Silat"
        siteName="Nusa Wiraga"
        description="Pendaftaran online Kejuaraan Pencak Silat Nusa Wiraga 2026, 10-11 Oktober di Kaza Mall, Surabaya. Tanding & Seni untuk semua kelompok usia."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "SportsEvent",
          name: "Kejuaraan Pencak Silat Nusa Wiraga 2026",
          startDate: "2026-10-10",
          endDate: "2026-10-11",
          location: { "@type": "Place", name: "Kaza Mall Surabaya", address: "Surabaya, Jawa Timur" },
          organizer: { "@type": "Organization", name: "Nusa Wiraga" },
        }}
      />
      <Navbar />
      <Hero />
      <AboutSection />
      <CategoriesSection />
      <BracketSection />
      <ResultsSection />
      <SponsorsSection />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
