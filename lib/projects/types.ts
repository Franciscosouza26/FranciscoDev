import type { Project } from "@/lib/portfolio";

/** Resultado de algo que pode falhar sem derrubar a página: quem chama decide o fallback. */
export type Result<T> = { ok: true; value: T } | { ok: false; reason: string };

export type RepoPage = { path: string; html: string };

// `source` explícito (em vez de `html?`) obriga o componente a tratar os dois casos.
export type ReadmeContent =
  | { source: "github"; html: string; url: string; pages: RepoPage[]; fetchedAt: string }
  | { source: "local" };

export type LiveDemo = {
  url: string;
  online: boolean;
  embeddable: boolean; // o site permite ser exibido em iframe por outro domínio?
  reason?: string; // por que não dá para embutir — aparece no preview
};

/** O que chega aos componentes: dados do portfolio.ts já enriquecidos com o GitHub (ou não). */
export type ProjectView = Project & {
  readme: ReadmeContent;
  commitsSource: "github" | "local";
  live: LiveDemo | null;
};
