import { MapPin, Mail, Phone } from "lucide-react";
import { Link } from "react-router-dom";

export const Footer = () => (
  <footer className="border-t border-amber-500/20 bg-[#0B0B0E]" data-testid="footer">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
      <div>
        <div className="flex items-center gap-2">
          <img src="/logo-nusawiraga-144.webp" alt="Logo Nusa Wiraga" className="h-9 w-9 rounded-xl object-cover" />
          <span className="font-display text-lg font-extrabold">NUSA <span className="text-gold-gradient">WIRAGA</span></span>
        </div>
        <p className="mt-4 max-w-xs text-sm text-slate-400">
          Kejuaraan pencak silat tahunan. Dua hari penuh aksi para pendekar Nusantara, 1x dalam setahun.
        </p>
      </div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Tautan</h3>
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          <li><a href="/#profil" className="hover:text-amber-400">Profil & Visi</a></li>
          <li><a href="/#kategori" className="hover:text-amber-400">Kategori & Biaya</a></li>
          <li><a href="/#hasil" className="hover:text-amber-400">Hasil Pertandingan</a></li>
          <li><Link to="/daftar" className="hover:text-amber-400">Pendaftaran Online</Link></li>
          <li><Link to="/admin" className="hover:text-amber-400">Admin Portal</Link></li>
        </ul>
      </div>
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">Sekretariat</h3>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="flex gap-2"><MapPin className="h-4 w-4 shrink-0 text-amber-400" /> Kaza Mall, Surabaya, Jawa Timur</li>
          <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-amber-400" /> 0851-0047-6404 (Nayla)</li>
          <li className="flex gap-2"><Phone className="h-4 w-4 shrink-0 text-amber-400" /> 0838-4895-6603 (Alfian)</li>
          <li className="flex gap-2"><Mail className="h-4 w-4 shrink-0 text-amber-400" /> panitia@nusawiraga.id</li>
        </ul>
      </div>
    </div>
    <div className="border-t border-[#2E2E3A] py-6 text-center text-xs text-slate-500">
      &copy; 2026 Panitia Kejuaraan Pencak Silat Nusa Wiraga. Satria, Tangkas, Berbudaya.
    </div>
  </footer>
);
