"use client";

import { useState } from "react";
import { contacts } from "@/lib/portfolio";

/** Copia o e-mail; se o navegador bloquear a área de transferência, abre o mailto no lugar. */
export function CopyEmail({ label = "copiar" }: { label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contacts.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${contacts.email}`;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="min-h-9 cursor-pointer border border-phosphor-dim px-2 text-xs transition-colors hover:bg-phosphor hover:text-void sm:min-h-7"
      >
        {copied ? "copiado ✓" : label}
      </button>
      <span role="status" className="sr-only">
        {copied ? "E-mail copiado" : ""}
      </span>
    </>
  );
}
