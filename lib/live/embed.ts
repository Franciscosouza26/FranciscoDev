/*
 * Um site decide se pode ser exibido dentro de um <iframe> de outro domínio por dois headers:
 * - `Content-Security-Policy: frame-ancestors …` (moderno; quando existe, vale ele)
 * - `X-Frame-Options: DENY | SAMEORIGIN` (antigo; usado só se não houver frame-ancestors)
 * Se o site recusa, o navegador mostra um quadro vazio — melhor descobrir no servidor e
 * cair nos prints do que exibir uma demo quebrada.
 */

export type EmbedCheck = { embeddable: true } | { embeddable: false; reason: string };

/** `https://*.vercel.app` casa com `https://meu.vercel.app`; `https:` casa com qualquer origem https. */
function sourceMatches(source: string, origin: URL) {
  if (source === "*") return true;
  if (/^[a-z][a-z\d+.-]*:$/i.test(source)) return origin.protocol === source.toLowerCase();
  const m = source.match(/^(?:([a-z][a-z\d+.-]*):\/\/)?(\*\.)?([^/:]+)(?::(\d+|\*))?/i);
  if (!m) return false;
  const [, scheme, wildcard, host, port] = m;
  if (scheme && `${scheme.toLowerCase()}:` !== origin.protocol) return false;
  if (port && port !== "*" && port !== (origin.port || (origin.protocol === "https:" ? "443" : "80"))) return false;
  const h = host.toLowerCase();
  return wildcard ? origin.hostname.endsWith(`.${h}`) : origin.hostname === h;
}

export function checkEmbeddable(headers: Headers, siteOrigin?: string): EmbedCheck {
  const csp = headers.get("content-security-policy") ?? "";
  const directive = csp
    .split(/[;,]/)
    .map((d) => d.trim())
    .find((d) => d.toLowerCase().startsWith("frame-ancestors"));

  if (directive) {
    const sources = directive.split(/\s+/).slice(1);
    if (sources.includes("*")) return { embeddable: true };
    if (!sources.length || sources.includes("'none'")) return { embeddable: false, reason: "o site proíbe iframe (frame-ancestors 'none')" };
    if (siteOrigin && sources.some((s) => sourceMatches(s, new URL(siteOrigin)))) return { embeddable: true };
    return { embeddable: false, reason: "o site só permite iframe nos próprios domínios (frame-ancestors)" };
  }

  const xfo = headers.get("x-frame-options")?.trim().toUpperCase();
  if (xfo === "DENY" || xfo === "SAMEORIGIN" || xfo?.startsWith("ALLOW-FROM")) {
    return { embeddable: false, reason: `o site proíbe iframe (X-Frame-Options: ${xfo})` };
  }
  return { embeddable: true };
}
