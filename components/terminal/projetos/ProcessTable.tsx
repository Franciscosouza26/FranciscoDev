import type { Project } from "@/lib/portfolio";
import { SELECTED, UNSELECTED } from "./styles";

const STATUS_GLYPH: Record<Project["status"], string> = {
  rodando: "●",
  concluído: "✓",
};

/** `[||||||||  ]` — um "|" a cada 10%, sempre com 10 casas para as colunas não dançarem. */
function asciiBar(progress: number) {
  const filled = Math.round(Math.min(100, Math.max(0, progress)) / 10);
  return `[${"|".repeat(filled)}${" ".repeat(10 - filled)}]`;
}

/*
 * Mesma grade para cabeçalho e linhas. No desktop é a tabela do `top`; abaixo de `sm` cada
 * processo vira 2 linhas (nome + status / pid · tipo · barra) com grid-template-areas,
 * sem duplicar o JSX.
 */
const GRID =
  "grid grid-cols-[auto_1fr_auto] gap-x-3 [grid-template-areas:'name_name_status'_'pid_kind_bar'] " +
  "sm:grid-cols-[20px_52px_200px_130px_120px_1fr] sm:[grid-template-areas:'mark_pid_name_kind_status_bar']";

export function ProcessTable({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[];
  selected: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="border border-phosphor-faint">
      {/* cabeçalho só visual: cada botão já diz tudo em voz alta */}
      <div aria-hidden="true" className={`${GRID} hidden bg-phosphor-faint/50 px-3 py-1.5 text-xs text-mint sm:grid`}>
        <span className="[grid-area:mark]" />
        <span className="[grid-area:pid]">PID</span>
        <span className="[grid-area:name]">NOME</span>
        <span className="[grid-area:kind]">TIPO</span>
        <span className="[grid-area:status]">STATUS</span>
        <span className="[grid-area:bar]">PROGRESSO</span>
      </div>

      <ul>
        {projects.map((p, i) => {
          const on = i === selected;
          return (
            <li key={p.slug} className="border-t border-phosphor-faint/60 first:border-t-0 sm:first:border-t">
              <button
                type="button"
                onClick={() => onSelect(i)}
                aria-pressed={on}
                className={`${GRID} min-h-11 w-full cursor-pointer items-center gap-y-0.5 px-3 py-2 text-left text-sm transition-colors focus-visible:-outline-offset-2 sm:min-h-8 sm:py-0 ${
                  on ? SELECTED : UNSELECTED
                }`}
              >
                <span aria-hidden="true" className="hidden [grid-area:mark] sm:inline">
                  {on ? "▶" : ""}
                </span>
                <span className="text-xs tabular-nums opacity-75 [grid-area:pid] sm:text-sm">{p.pid}</span>
                <span className="truncate [grid-area:name]">{p.name}</span>
                <span className="truncate text-xs opacity-75 [grid-area:kind] sm:text-sm">{p.kind}</span>
                <span className="justify-self-end whitespace-nowrap [grid-area:status] sm:justify-self-auto">
                  <span aria-hidden="true">{STATUS_GLYPH[p.status]}</span> {p.status}
                </span>
                <span className="justify-self-end text-xs tabular-nums [grid-area:bar] sm:justify-self-auto sm:text-sm">
                  <span aria-hidden="true" className="whitespace-pre">
                    {asciiBar(p.progress)}{" "}
                  </span>
                  {p.progress}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
