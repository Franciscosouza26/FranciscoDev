import type { ProjectView } from "@/lib/projects/types";
import { GitLogView } from "./GitLogView";
import { ManView } from "./ManView";
import { ReadmeView } from "./ReadmeView";
import { SCROLL_STYLE } from "./styles";

export type Tab = "man" | "log" | "readme";

/*
 * Abas como botões simples com aria-pressed (decisão do Francisco): cada aba é uma parada
 * do Tab, e o leitor anuncia "botão, git log, pressionado". Mais previsível que o padrão
 * tablist para só 3 abas, e igual ao resto da tela (processos, opções, commits).
 */
export function ProjectTabs({
  project,
  tab,
  onTab,
  step,
  onStep,
}: {
  project: ProjectView;
  tab: Tab;
  onTab: (tab: Tab) => void;
  step: number;
  onStep: (step: number) => void;
}) {
  const tabs: [Tab, string][] = [
    ["man", `man ${project.slug}`],
    ["log", "git log"],
    ["readme", "README.md"],
  ];

  return (
    <section aria-label={`Detalhes de ${project.name}`} className="flex min-h-0 flex-col border border-phosphor-faint">
      <div className="grid grid-cols-3 border-b border-phosphor-faint sm:flex">
        {tabs.map(([id, label]) => {
          const on = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onTab(id)}
              aria-pressed={on}
              className={`min-h-11 cursor-pointer truncate border-r border-phosphor-faint px-3.5 text-sm transition-colors last:border-r-0 focus-visible:-outline-offset-2 sm:min-h-8.5 sm:last:border-r ${
                on
                  ? "bg-phosphor/12 text-mint shadow-[inset_0_-2px_0_var(--color-phosphor)]"
                  : "text-phosphor-dim hover:text-phosphor"
              }`}
            >
              {label}
            </button>
          );
        })}
        <span aria-hidden="true" className="ml-auto hidden items-center px-3 text-xs text-phosphor-dim sm:flex">
          {project.slug}
        </span>
      </div>

      {/* altura fixa: trocar de aba não empurra o resto da tela */}
      <div data-scroll className="h-80 overflow-y-auto px-4.5 py-3.5 text-sm" style={SCROLL_STYLE}>
        {tab === "man" && <ManView project={project} step={step} onStep={onStep} />}
        {tab === "log" && <GitLogView project={project} step={step} onStep={onStep} />}
        {tab === "readme" && <ReadmeView key={project.slug} project={project} />}
      </div>
    </section>
  );
}
