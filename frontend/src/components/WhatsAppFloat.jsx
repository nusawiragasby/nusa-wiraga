import { MessageCircle } from "lucide-react";
import { ContactPanitia } from "@/components/ContactPanitia";

export const WhatsAppFloat = () => (
  <ContactPanitia
    message="Halo Panitia Nusa Wiraga, saya ingin informasi mengenai Kejuaraan Silat Nusa Wiraga 2026."
    testId="floating-whatsapp-btn"
    ariaLabel="Hubungi panitia via WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-stone-900 transition-transform hover:scale-110 glow-gold"
  >
    <MessageCircle className="h-7 w-7" />
  </ContactPanitia>
);
