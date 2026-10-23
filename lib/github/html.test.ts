import { describe, expect, it } from "vitest";
import { prepareHtml } from "./html";

const ctx = { repo: "francisco/findparty", docPath: "README.md", pages: ["docs/arquitetura.md"] };

describe("prepareHtml — segurança", () => {
  it("remove <script> e o conteúdo dele", () => {
    expect(prepareHtml('<p>oi</p><script>alert(1)</script>', ctx)).toBe("<p>oi</p>");
  });

  it("remove handlers on* e links javascript:", () => {
    const out = prepareHtml('<img src="https://x.com/a.png" onerror="alert(1)"><a href="javascript:alert(1)">x</a>', ctx);
    expect(out).not.toContain("onerror");
    expect(out).not.toContain("javascript:");
  });

  it("remove iframe, style e atributo style", () => {
    const out = prepareHtml('<iframe src="https://evil.com"></iframe><style>body{}</style><p style="color:red">t</p>', ctx);
    expect(out).toBe("<p>t</p>");
  });

  it("ignora data-page vindo do markdown (só o servidor cria)", () => {
    const out = prepareHtml('<a href="https://evil.com" data-page="docs/arquitetura.md">x</a>', ctx);
    expect(out).not.toContain("data-page");
  });

  it("mantém só ids com o prefixo do GitHub", () => {
    expect(prepareHtml('<h2 id="user-content-uso">Uso</h2>', ctx)).toContain('id="user-content-uso"');
    expect(prepareHtml('<h2 id="root">Uso</h2>', ctx)).toBe("<h2>Uso</h2>");
  });
});

describe("prepareHtml — links e imagens", () => {
  it("link para página listada vira data-page, com href de fallback para o GitHub", () => {
    const out = prepareHtml('<a href="docs/arquitetura.md">arq</a>', ctx);
    expect(out).toContain('data-page="docs/arquitetura.md"');
    expect(out).toContain('href="https://github.com/francisco/findparty/blob/HEAD/docs/arquitetura.md"');
  });

  it("resolve caminho relativo ao documento atual", () => {
    const out = prepareHtml('<a href="../README.md">voltar</a>', { ...ctx, docPath: "docs/arquitetura.md" });
    expect(out).toContain('data-page="README.md"');
  });

  it("link relativo fora da lista abre no GitHub em nova aba", () => {
    const out = prepareHtml('<a href="src/app.ts">código</a>', ctx);
    expect(out).toContain("https://github.com/francisco/findparty/blob/HEAD/src/app.ts");
    expect(out).toContain('target="_blank"');
    expect(out).not.toContain("data-page");
  });

  it("link externo ganha rel noopener", () => {
    expect(prepareHtml('<a href="https://expo.dev">expo</a>', ctx)).toContain('rel="noopener noreferrer"');
  });

  it("âncora aponta para o id prefixado", () => {
    expect(prepareHtml('<a href="#uso">uso</a>', ctx)).toContain('href="#user-content-uso"');
  });

  it("imagem relativa vira raw.githubusercontent", () => {
    expect(prepareHtml('<img src="docs/tela.png" alt="tela">', ctx)).toContain(
      'src="https://raw.githubusercontent.com/francisco/findparty/HEAD/docs/tela.png"',
    );
  });

  it("âncora do título (formato real do GitHub) vira só o id, sem href focável", () => {
    const out = prepareHtml(
      '<div class="markdown-heading"><h2 class="heading-element">Uso</h2><a id="user-content-uso" class="anchor" href="#uso"><svg><path d="M0"/></svg></a></div>',
      ctx,
    );
    expect(out).toBe('<div><h2>Uso</h2><a id="user-content-uso"></a></div>');
  });

  it("remove link vazio sem id", () => {
    expect(prepareHtml('<p>a<a href="https://x.com"></a></p>', ctx)).toBe("<p>a</p>");
  });
});
