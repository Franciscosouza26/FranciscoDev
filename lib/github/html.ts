import sanitizeHtml from "sanitize-html";

/*
 * O HTML do README vem do GitHub, mas quem escreveu o markdown pode ter colocado HTML
 * cru nele (<img onerror=…>, <a href="javascript:…">). Renderizar isso sem filtro seria
 * XSS dentro do portfólio. Por isso: allowlist — só passa o que está listado aqui.
 *
 * Além de limpar, reescreve os links para funcionarem fora do github.com:
 * - link para uma página de `pages` → `data-page`, o painel troca de página sem sair do site
 * - outro link relativo           → github.com/<repo>/blob/HEAD/<caminho>
 * - imagem relativa               → raw.githubusercontent.com/<repo>/HEAD/<caminho>
 * HEAD = branch padrão do repo, seja ela main ou master — sem uma chamada extra para descobrir.
 */

export type HtmlContext = {
  repo: string;
  docPath: string; // caminho do documento atual ("README.md", "docs/guia.md") — base dos links relativos
  pages: string[];
};

const ID_PREFIX = "user-content-"; // o GitHub já prefixa os ids; ids sem prefixo poderiam sobrescrever ids da página

/** Resolve `href` relativo ao documento atual. Devolve o caminho no repo ou null se não for relativo. */
export function resolveRepoPath(href: string, docPath: string) {
  if (/^[a-z][a-z\d+.-]*:/i.test(href) || href.startsWith("//") || href.startsWith("#")) return null;
  const url = new URL(href, `https://repo.invalid/${docPath}`);
  return { path: decodeURIComponent(url.pathname.slice(1)), hash: url.hash };
}

export function prepareHtml(raw: string, { repo, docPath, pages }: HtmlContext) {
  return sanitizeHtml(raw, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags.filter((t) => !["main", "nav", "header", "footer", "aside"].includes(t)),
      "img",
      "details",
      "summary",
      "del",
      "ins",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel", "data-page", "id"],
      img: ["src", "alt", "width", "height", "loading"],
      td: ["align"],
      th: ["align"],
      ol: ["start"],
      h1: ["id"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
      h5: ["id"],
      h6: ["id"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (tag, attribs) => ({ tagName: tag, attribs: rewriteLink(attribs, { repo, docPath, pages }) }),
      img: (tag, attribs) => {
        const target = attribs.src ? resolveRepoPath(attribs.src, docPath) : null;
        const src = target ? `https://raw.githubusercontent.com/${repo}/HEAD/${encodeURI(target.path)}` : attribs.src;
        return { tagName: tag, attribs: { ...attribs, src: src ?? "", loading: "lazy" } };
      },
      ...Object.fromEntries(
        ["h1", "h2", "h3", "h4", "h5", "h6"].map((h) => [
          h,
          (tag: string, attribs: sanitizeHtml.Attributes) => {
            const { id, ...rest } = attribs;
            return { tagName: tag, attribs: id?.startsWith(ID_PREFIX) ? { ...rest, id } : rest };
          },
        ]),
      ),
    },
    // link vazio (sem texto, imagem nem id de âncora) não serve para nada
    exclusiveFilter: (frame) => frame.tag === "a" && !frame.text.trim() && !frame.mediaChildren.length && !frame.attribs.id,
  });
}

function rewriteLink(attribs: sanitizeHtml.Attributes, { repo, docPath, pages }: HtmlContext): sanitizeHtml.Attributes {
  // O GitHub põe o id do título num <a class="anchor"><svg/></a> ao lado dele (não no <h2>).
  // Fica só o id: os links "#secao" continuam funcionando, e sem href ele não entra no Tab.
  if (attribs.class?.split(/\s+/).includes("anchor")) {
    return attribs.id?.startsWith(ID_PREFIX) ? { id: attribs.id } : {};
  }
  const { href, id, ...rest } = attribs;
  if (id?.startsWith(ID_PREFIX)) rest.id = id;
  delete rest["data-page"]; // só nós criamos data-page; não confiar no que veio do markdown
  if (!href) return rest;

  if (href.startsWith("#")) {
    const id = href.slice(1);
    return { ...rest, href: id.startsWith(ID_PREFIX) ? href : `#${ID_PREFIX}${id}` };
  }

  const target = resolveRepoPath(href, docPath);
  if (!target) return { ...rest, href, target: "_blank", rel: "noopener noreferrer" };

  const blob = `https://github.com/${repo}/blob/HEAD/${encodeURI(target.path)}${target.hash}`;
  if (pages.includes(target.path) || target.path === "README.md") {
    // sem JavaScript o href ainda leva ao GitHub; com JavaScript o painel intercepta o clique
    return { ...rest, href: blob, "data-page": target.path };
  }
  return { ...rest, href: blob, target: "_blank", rel: "noopener noreferrer" };
}
