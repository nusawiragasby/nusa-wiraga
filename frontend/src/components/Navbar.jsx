import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";

const LINKS = [
  { label: "Beranda", href: "/#beranda", testId: "nav-home-link" },
  { label: "Profil & Visi", href: "/#profil", testId: "nav-profile-link" },
  { label: "Kategori & Biaya", href: "/#kategori", testId: "nav-category-link" },
  { label: "Bagan", href: "/#bagan", testId: "nav-bracket-link" },
  { label: "Hasil Pertandingan", href: "/#hasil", testId: "nav-results-link" },
  { label: "Sponsor", href: "/#sponsor", testId: "nav-sponsor-link" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-amber-500/20 bg-[#0B0B0E]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="/#beranda" className="flex items-center gap-2" data-testid="nav-logo">
          <img src="/logo-nusawiraga.png" alt="Logo Nusa Wiraga" className="h-9 w-9 rounded-xl object-cover glow-gold" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            NUSA <span className="text-gold-gradient">WIRAGA</span>
          </span>
        </a>
        <nav className="hidden items-center gap-6 lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} data-testid={l.testId}
              className="text-sm text-slate-300 transition-colors hover:text-amber-400">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/admin" data-testid="nav-admin-btn"
            className="rounded-xl border border-[#800E19] px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:bg-[#800E19]/30">
            Admin Portal
          </Link>
          <Link to="/daftar" data-testid="nav-register-btn"
            className="rounded-xl bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 px-4 py-2 text-sm font-bold text-stone-900 transition-transform hover:scale-105 glow-gold">
            Daftar Sekarang
          </Link>
        </div>
        <button className="lg:hidden text-slate-200" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-amber-500/10 bg-[#0B0B0E] px-4 py-4 lg:hidden" data-testid="nav-mobile-menu">
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} data-testid={`${l.testId}-mobile`} onClick={() => setOpen(false)}
                className="text-sm text-slate-300 hover:text-amber-400">
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex gap-3">
              <Link to="/admin" data-testid="nav-admin-btn-mobile" className="flex-1 rounded-xl border border-[#800E19] px-4 py-2 text-center text-sm font-semibold">Admin</Link>
              <Link to="/daftar" data-testid="nav-register-btn-mobile" className="flex-1 rounded-xl bg-amber-500 px-4 py-2 text-center text-sm font-bold text-stone-900">Daftar</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
