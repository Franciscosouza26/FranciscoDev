import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Result } from "@/lib/projects/types";
import { describeError, githubJson } from "./client";

export type GitHubProfile = { publicRepos: number; lastPush: { repo: string; at: string } | null };

const MAX_BYTES = 100_000;
const USER_RE = /^[a-z\d](?:[a-z\d-]{0,38})$/i;

/**
 * Números do card do GitHub na tela de contato: quantos repos públicos e qual foi o último push.
 * Mesma regra do repo.ts: nunca lança erro, sucesso em cache por horas e falha por minutos.
 */
export async function fetchGitHubProfile(user: string): Promise<Result<GitHubProfile>> {
  "use cache";
  cacheTag(`user:${user}`);
  try {
    if (!USER_RE.test(user)) throw new Error(`usuário inválido: "${user}"`);
    const [profile, repos] = await Promise.all([
      githubJson<{ public_repos: number }>(`/users/${user}`, MAX_BYTES),
      githubJson<{ name: string; pushed_at: string }[]>(`/users/${user}/repos?sort=pushed&per_page=1`, MAX_BYTES),
    ]);
    cacheLife("hours");
    const last = repos[0];
    return {
      ok: true,
      value: { publicRepos: profile.public_repos, lastPush: last ? { repo: last.name, at: last.pushed_at } : null },
    };
  } catch (error) {
    cacheLife("minutes");
    return { ok: false, reason: describeError(error) };
  }
}
