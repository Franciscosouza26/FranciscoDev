import "server-only";
import { projects, type Project } from "@/lib/portfolio";
import { fetchCommit, fetchPageHtml, fetchReadmeHtml } from "@/lib/github/repo";
import { checkLive } from "@/lib/live/check";
import { buildProjectView } from "./merge";
import type { ProjectView, Result } from "./types";

const MAX_PAGES = 5;

/**
 * Projetos prontos para a tela: portfolio.ts + GitHub + status da demo ao vivo.
 * Só repos declarados no portfolio.ts são consultados — nada que o visitante digita chega aqui.
 */
export async function getProjectsContent(): Promise<ProjectView[]> {
  return Promise.all(projects.map(loadProject));
}

async function loadProject(project: Project): Promise<ProjectView> {
  const { repo, liveUrl } = project;
  const pages = (project.pages ?? []).slice(0, MAX_PAGES);
  const hashes = project.steps.flatMap((s) => (s.commit ? [s.commit.hash] : []));

  // tudo em paralelo; as funções nunca lançam erro (devolvem Result), então uma falha não cancela as outras
  const [readme, pageResults, commitResults, live] = await Promise.all([
    repo ? fetchReadmeHtml(repo) : null,
    repo ? Promise.all(pages.map(async (path) => ({ path, result: await fetchPageHtml(repo, path) }))) : [],
    repo ? Promise.all(hashes.map(async (hash) => [hash, await fetchCommit(repo, hash)] as const)) : [],
    liveUrl ? checkLive(liveUrl) : null,
  ]);

  // log do servidor: o visitante vê o fallback, você vê o motivo
  warn(project.slug, "README", readme);
  pageResults.forEach((p) => warn(project.slug, p.path, p.result));
  commitResults.forEach(([hash, result]) => warn(project.slug, `commit ${hash}`, result));
  if (live && !live.embeddable) console.warn(`[projetos] ${project.slug}: demo ao vivo indisponível — ${live.reason}`);

  return buildProjectView(project, { readme, pages: pageResults, commits: new Map(commitResults), live });
}

function warn(slug: string, what: string, result: Result<unknown> | null) {
  if (result && !result.ok) console.warn(`[projetos] ${slug}: ${what} usando fallback local — ${result.reason}`);
}
