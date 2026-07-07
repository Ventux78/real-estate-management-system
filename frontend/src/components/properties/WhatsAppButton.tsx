"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function WhatsAppButton() {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const message = url ? `Merhaba ${url} ile ilgili bilgi almak istiyorum.` : "Merhaba, ilanınızla ilgili bilgi almak istiyorum.";
  const wpLink = `https://wa.me/905535048585?text=${encodeURIComponent(message)}`;

  return (
    <a href={url ? wpLink : "#"} target="_blank" rel="noopener noreferrer" className="block w-full">
      <Button size="lg" className="w-full h-14 text-lg bg-[#25D366] hover:bg-[#128C7E] text-white">
        <Phone className="w-5 h-5 mr-2" />
        WhatsApp ile İletişime Geç
      </Button>
    </a>
  );
}
