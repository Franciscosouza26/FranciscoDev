import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { ProjectCommit } from "@/lib/portfolio";
import type { Result } from "@/lib/projects/types";
import { ACCEPT_HTML, assertRepo, describeError, encodePath, githubJson, githubText } from "./client";

/*
 * Cada função é um "use cache" separado: README, páginas e commits expiram e falham
 * de forma independente. Sucesso fica em cache por horas; falha por minutos — um GitHub
 * fora do ar por 2 minutos não deixa o fallback preso na página por 1 hora.
 * Nunca lançam erro: devolvem Result e quem chama decide o fallback.
 * Tag `repo:<repo>` permite invalidar tudo de um repo de uma vez (webhook, fase 2).
 */

const MAX_DOC_BYTES = 200_000;
const MAX_COMMIT_BYTES = 3_000_000; // o JSON do commit inclui os patches; só usamos os totais

// `fetchedAt` nasce aqui dentro: com cacheComponents, `new Date()` fora de um escopo em cache quebra o prerender
export async function fetchReadmeHtml(repo: string): Promise<Result<{ html: string; fetchedAt: string }>> {
  "use cache";
  cacheTag(`repo:${repo}`);
  try {
    assertRepo(repo);
    const html = await githubText(`/repos/${repo}/readme`, ACCEPT_HTML, MAX_DOC_BYTES);
    cacheLife("hours");
    return { ok: true, value: { html, fetchedAt: new Date().toISOString() } };
  } catch (error) {
    cacheLife("minutes");
    return { ok: false, reason: describeError(error) };
  }
}

export async function fetchPageHtml(repo: string, path: string): Promise<Result<string>> {
  "use cache";
  cacheTag(`repo:${repo}`);
  try {
    assertRepo(repo);
    if (!/\.(md|markdown)$/i.test(path)) throw new Error(`só arquivos markdown: ${path}`);
    const html = await githubText(`/repos/${repo}/contents/${encodePath(path)}`, ACCEPT_HTML, MAX_DOC_BYTES);
    cacheLife("hours");
    return { ok: true, value: html };
  } catch (error) {
    cacheLife("minutes");
    return { ok: false, reason: describeError(error) };
  }
}

type CommitResponse = {
  sha: string;
  commit: { message: string; author: { date: string } | null };
  stats?: { additions: number; deletions: number };
  files?: unknown[];
};

/** Só os campos do `git log` — sem tag: tags do GitHub exigiriam outra chamada, então a tag vem do portfolio.ts. */
export async function fetchCommit(repo: string, sha: string): Promise<Result<Omit<ProjectCommit, "tag">>> {
  "use cache";
  cacheTag(`repo:${repo}`);
  try {
    assertRepo(repo);
    if (!/^[\da-f]{7,40}$/i.test(sha)) throw new Error(`hash inválido: ${sha}`);
    const data = await githubJson<CommitResponse>(`/repos/${repo}/commits/${sha}`, MAX_COMMIT_BYTES);
    cacheLife("days"); // um commit nunca muda
    return {
      ok: true,
      value: {
        hash: data.sha.slice(0, 7),
        message: data.commit.message.split("\n")[0],
        date: (data.commit.author?.date ?? "").slice(0, 10),
        files: data.files?.length ?? 0,
        additions: data.stats?.additions ?? 0,
        deletions: data.stats?.deletions ?? 0,
      },
    };
  } catch (error) {
    cacheLife("minutes");
    return { ok: false, reason: describeError(error) };
  }
}
