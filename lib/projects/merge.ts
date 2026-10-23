import type { Project, ProjectCommit } from "@/lib/portfolio";
import { prepareHtml } from "@/lib/github/html";
import type { LiveDemo, ProjectView, Result } from "./types";

/*
 * Regra de negócio do fallback, sem rede nem cache — por isso dá para testar isolada.
 * Cada campo cai para o dado local sozinho: README falhou mas commits vieram? Mostra os commits reais.
 */

export type Fetched = {
  readme: Result<{ html: string; fetchedAt: string }> | null; // null = projeto sem `repo`
  pages: { path: string; result: Result<string> }[];
  commits: Map<string, Result<Omit<ProjectCommit, "tag">>>; // chave = hash local do passo
  live: LiveDemo | null;
};

export function buildProjectView(project: Project, fetched: Fetched): ProjectView {
  const repo = project.repo;
  let enriched = 0;

  const steps = project.steps.map((step) => {
    const remote = step.commit && fetched.commits.get(step.commit.hash);
    if (!step.commit || !remote?.ok) return step;
    enriched++;
    return { ...step, commit: { ...remote.value, tag: step.commit.tag } };
  }) as Project["steps"]; // map preserva o tamanho da tupla; o TS só não consegue provar isso

  // só viram links internos as páginas que realmente chegaram; as outras continuam indo ao GitHub
  const okPages = fetched.pages.flatMap((p) => (p.result.ok ? [{ path: p.path, raw: p.result.value }] : []));
  const pagePaths = okPages.map((p) => p.path);

  const readme: ProjectView["readme"] =
    repo && fetched.readme?.ok
      ? {
          source: "github",
          html: prepareHtml(fetched.readme.value.html, { repo, docPath: "README.md", pages: pagePaths }),
          url: `https://github.com/${repo}#readme`,
          fetchedAt: fetched.readme.value.fetchedAt,
          pages: okPages.map((p) => ({ path: p.path, html: prepareHtml(p.raw, { repo, docPath: p.path, pages: pagePaths }) })),
        }
      : { source: "local" };

  return { ...project, steps, readme, commitsSource: enriched > 0 ? "github" : "local", live: fetched.live };
}
