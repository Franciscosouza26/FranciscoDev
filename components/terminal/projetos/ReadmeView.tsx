"use client";

import { useRef, useState, type MouseEvent } from "react";
import type { ProjectView } from "@/lib/projects/types";

const fetchedFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

function H2({ children }: { children: string }) {
  return <h3 className="font-bold text-mint">## {children}</h3>;
}

/**
 * README renderizado. Vem do GitHub (HTML já sanitizado no servidor) ou, se a busca falhou
 * ou o projeto não tem `repo`, do fallback montado com os dados do portfolio.ts.
 * Sem TypeOut aqui: texto longo redigitado a cada troca de aba cansa.
 * O pai monta com `key={slug}`, então a página aberta volta para o README ao trocar de projeto.
 */
export function ReadmeView({ project }: { project: ProjectView }) {
  return project.readme.source === "github" ? (
    <GithubReadme readme={project.readme} />
  ) : (
    <LocalReadme project={project} />
  );
}

function GithubReadme({ readme }: { readme: Extract<ProjectView["readme"], { source: "github" }> }) {
  const [page, setPage] = useState<string | null>(null); // null = README
  const rootRef = useRef<HTMLDivElement>(null);
  const current = page ? readme.pages.find((p) => p.path === page) : undefined;

  // links internos foram marcados com data-page no servidor; aqui só interceptamos o clique
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>("a[data-page]");
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey) return; // ctrl+clique continua abrindo no GitHub
    const target = link.dataset.page!;
    const known = target === "README.md" || readme.pages.some((p) => p.path === target);
    if (!known) return;
    e.preventDefault();
    setPage(target === "README.md" ? null : target);
    rootRef.current?.closest("[data-scroll]")?.scrollTo({ top: 0 });
  };

  return (
    <div ref={rootRef} className="space-y-2.5">
      <p className="flex flex-wrap justify-between gap-x-3 text-phosphor-dim">
        <span>
          $ cat {current?.path ?? "README.md"} <span className="opacity-80">· renderizado</span>
        </span>
        <span className="text-xs opacity-80">github · {fetchedFormat.format(new Date(readme.fetchedAt))}</span>
      </p>

      {readme.pages.length > 0 && (
        <nav aria-label="Páginas do repositório" className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {[{ path: "README.md", id: null }, ...readme.pages.map((p) => ({ path: p.path, id: p.path }))].map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => setPage(p.id)}
              aria-pressed={page === p.id}
              className={`min-h-8 cursor-pointer px-1.5 transition-colors ${
                page === p.id ? "bg-phosphor/12 text-mint shadow-[inset_0_-2px_0_var(--color-phosphor)]" : "text-phosphor-dim hover:text-phosphor"
              }`}
            >
              {p.path}
            </button>
          ))}
        </nav>
      )}

      {/* HTML sanitizado no servidor (lib/github/html.ts) — por isso é seguro injetar aqui */}
      <div className="readme" onClick={onClick} dangerouslySetInnerHTML={{ __html: current?.html ?? readme.html }} />

      <div className="flex flex-wrap gap-4 border-t border-dashed border-phosphor-faint pt-2.5 text-sm">
        <a className="text-mint underline-offset-4 hover:underline" href={readme.url} target="_blank" rel="noreferrer">
          [ver no GitHub ↗]
        </a>
      </div>
    </div>
  );
}

function LocalReadme({ project }: { project: ProjectView }) {
  const repoUrl = project.repo ? `https://github.com/${project.repo}` : project.code;

  return (
    <div className="space-y-2.5 leading-relaxed">
      <p className="flex flex-wrap justify-between gap-x-3 text-phosphor-dim">
        <span>
          $ cat README.md <span className="opacity-80">· renderizado</span>
        </span>
        <span className="text-xs opacity-80">cópia local</span>
      </p>
      <h3 className="text-lg font-bold text-mint"># {project.name}</h3>
      <ul aria-label="tags" className="flex flex-wrap gap-1.5">
        {project.tags.map((t) => (
          <li key={t} className="border border-phosphor-faint px-2 text-xs text-phosphor-dim">
            {t}
          </li>
        ))}
      </ul>
      <p className="max-w-[62ch]">{project.description}</p>

      <H2>Funcionalidades</H2>
      <ul className="ml-3">
        {project.steps.map((s) => (
          <li key={s.flag}>- {s.help}</li>
        ))}
      </ul>

      {project.decision && (
        <>
          <H2>Decisões</H2>
          <p className="max-w-[62ch]">{project.decision}</p>
        </>
      )}

      {project.run && (
        <>
          <H2>Rodando localmente</H2>
          <pre className="overflow-x-auto border border-phosphor-faint bg-phosphor-faint/35 px-3 py-2.5 text-xs">{project.run}</pre>
        </>
      )}

      {repoUrl && (
        <div className="flex flex-wrap gap-4 pt-1 text-sm">
          <a className="text-mint underline-offset-4 hover:underline" href={repoUrl} target="_blank" rel="noreferrer">
            [repositório ↗]
          </a>
        </div>
      )}
    </div>
  );
}
