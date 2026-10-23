// Item selecionado = vídeo invertido (fundo fósforo, texto escuro, sem brilho). Vale para
// processos, opções do man e commits — o mesmo sinal visual para "este é o atual".
export const SELECTED = "bg-phosphor text-void [text-shadow:none]";
export const UNSELECTED = "hover:bg-phosphor-faint/60";

// Mesmo scrollbar discreto da área de saída do terminal.
export const SCROLL_STYLE = { scrollbarColor: "var(--color-phosphor-faint) transparent", scrollbarWidth: "thin" } as const;
