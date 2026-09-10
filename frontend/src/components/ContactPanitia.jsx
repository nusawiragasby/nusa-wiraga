import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { WA_CONTACTS, waLink } from "@/lib/api";

/**
 * Satu tombol "Hubungi Panitia" — saat diklik, memunculkan pilihan panitia
 * (Nayla / Alfian) yang ingin dihubungi via WhatsApp.
 *
 * Props:
 * - message: teks WhatsApp yang sudah terisi otomatis
 * - className: gaya tombol pemicu
 * - children: isi tombol pemicu (teks/ikon)
 * - testId: data-testid tombol pemicu
 */
export const ContactPanitia = ({ message, className, children, testId, ariaLabel, title = "Hubungi Panitia" }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className} data-testid={testId} aria-label={ariaLabel}>
        {children}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm border-amber-500/30 bg-[#13131A] text-slate-50" data-testid="contact-panitia-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">{title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              Pilih panitia yang ingin Anda hubungi via WhatsApp.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1 space-y-2">
            {WA_CONTACTS.map((c, i) => (
              <a key={c.number} href={waLink(message, i)} target="_blank" rel="noopener noreferrer"
                onClick={() => setOpen(false)} data-testid={`contact-panitia-${c.name.toLowerCase()}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#2E2E3A] bg-[#0B0B0E] px-4 py-3 transition-colors hover:border-amber-500/40 hover:bg-[#800E19]/25">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-400">
                    <MessageCircle className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-100">Panitia {c.name}</span>
                    <span className="block text-xs text-slate-500">{c.display}</span>
                  </span>
                </span>
                <span className="text-xs font-semibold text-amber-300">Chat &rarr;</span>
              </a>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
