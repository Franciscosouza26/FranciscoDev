import "server-only"; // o token nunca pode chegar ao navegador: importar isto num Client Component quebra o build

/*
 * Único ponto do projeto que fala com a API do GitHub. Tudo que é "detalhe de rede"
 * (URL base, headers, token, timeout, limite de tamanho) mora aqui; o resto do código
 * só pede "me dá o README de tal repo".
 */

const API = "https://api.github.com";
const TIMEOUT_MS = 5000; // sem timeout, um GitHub lento seguraria o build/revalidação indefinidamente

export const ACCEPT_HTML = "application/vnd.github.html"; // GitHub devolve o markdown já renderizado
export const ACCEPT_JSON = "application/vnd.github+json";

// "usuario/repo" vem do portfolio.ts, mas configuração também é entrada: validar antes de montar URL
const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

export class GitHubError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export function assertRepo(repo: string) {
  if (!REPO_RE.test(repo)) throw new GitHubError(0, `repo inválido: "${repo}" (esperado "usuario/repositorio")`);
}

/** "docs/guia rápido.md" → "docs/guia%20r%C3%A1pido.md" — codifica cada pedaço, mantém as barras. */
export function encodePath(path: string) {
  if (path.split("/").some((part) => part === ".." || part === "")) throw new GitHubError(0, `caminho inválido: "${path}"`);
  return path.split("/").map(encodeURIComponent).join("/");
}

async function request(path: string, accept: string) {
  const headers: Record<string, string> = {
    Accept: accept,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "portfolio-terminal",
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) {
    const limited = res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0";
    throw new GitHubError(res.status, limited ? "limite de requisições do GitHub atingido" : `GitHub ${res.status} em ${path}`);
  }
  return res;
}

/** Lê a resposta como texto, desistindo se passar de `maxBytes` (um README gigante não entra no HTML da página). */
export async function githubText(path: string, accept: string, maxBytes: number) {
  const res = await request(path, accept);
  const length = Number(res.headers.get("content-length"));
  if (length > maxBytes) throw new GitHubError(413, `resposta grande demais (${length} bytes) em ${path}`);
  const text = await res.text();
  if (text.length > maxBytes) throw new GitHubError(413, `resposta grande demais em ${path}`);
  return text;
}

export async function githubJson<T>(path: string, maxBytes: number): Promise<T> {
  return JSON.parse(await githubText(path, ACCEPT_JSON, maxBytes)) as T;
}

export function describeError(error: unknown) {
  if (error instanceof GitHubError) return error.message;
  if (error instanceof Error && error.name === "TimeoutError") return "GitHub não respondeu a tempo";
  return "falha ao falar com o GitHub";
}
