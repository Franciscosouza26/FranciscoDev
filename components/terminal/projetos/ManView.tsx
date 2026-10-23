import type { ReactNode } from "react";
import type { Project } from "@/lib/portfolio";
import { SELECTED, UNSELECTED } from "./styles";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-mint">{title}</h3>
      <div className="ml-7">{children}</div>
    </div>
  );
}

/** Página de manual do projeto. Cada opção é um botão: executar a opção = ir para aquele passo da demo. */
export function ManView({ project, step, onStep }: { project: Project; step: number; onStep: (step: number) => void }) {
  const title = `${project.slug.toUpperCase()}(1)`;

  return (
    <div className="space-y-2.5">
      <p className="flex justify-between gap-2 text-mint">
        <span>{title}</span>
        <span className="hidden text-phosphor-dim sm:inline">Manual de Projetos</span>
        <span>{title}</span>
      </p>
      <Section title="NOME">
        {project.slug} — {project.name}, {project.kind}
      </Section>
      <Section title="SINOPSE">
        <span className="font-bold">{project.slug}</span> {project.synopsis}
      </Section>
      <Section title="DESCRIÇÃO">
        <p className="max-w-[62ch]">{project.description}</p>
      </Section>
      <div>
        <h3 className="font-bold text-mint">
          OPÇÕES <span className="font-normal text-phosphor-dim">— clique para executar</span>
        </h3>
        <ul className="ml-5 mt-0.5">
          {project.steps.map((s, i) => (
            <li key={s.flag}>
              <button
                type="button"
                onClick={() => onStep(i)}
                aria-pressed={i === step}
                className={`flex min-h-11 w-full cursor-pointer flex-wrap items-center gap-x-4 px-2 text-left transition-colors focus-visible:-outline-offset-2 sm:min-h-8 ${
                  i === step ? SELECTED : UNSELECTED
                }`}
              >
                <span className="font-bold">{s.flag}</span>
                <span className="opacity-80">{s.help}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
