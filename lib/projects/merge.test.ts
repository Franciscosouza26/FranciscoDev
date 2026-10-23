import { describe, expect, it } from "vitest";
import { projects } from "@/lib/portfolio";
import { buildProjectView, type Fetched } from "./merge";

const base = { ...projects[0], repo: "francisco/role" };
const s0 = base.steps[0];
const s1 = base.steps[1]!; // o Rolê de exemplo tem 3 passos; o tipo aceita 1, por isso o "!"
const none: Fetched = { readme: null, pages: [], commits: new Map(), live: null };

describe("buildProjectView — fallback", () => {
  it("sem repo: tudo local", () => {
    const view = buildProjectView({ ...base, repo: undefined }, none);
    expect(view.readme.source).toBe("local");
    expect(view.commitsSource).toBe("local");
    expect(view.steps).toEqual(base.steps);
  });

  it("README falhou: cai para local sem afetar o resto", () => {
    const remote = { hash: s0.commit!.hash, message: "feat: real", date: "2026-09-20", files: 3, additions: 10, deletions: 2 };
    const view = buildProjectView(base, {
      ...none,
      readme: { ok: false, reason: "GitHub 500" },
      commits: new Map([[s0.commit!.hash, { ok: true, value: remote }]]),
    });
    expect(view.readme.source).toBe("local");
    expect(view.commitsSource).toBe("github");
    expect(view.steps[0].commit).toEqual({ ...remote, tag: s0.commit!.tag }); // tag local preservada
  });

  it("commit que falhou mantém o dado local daquele passo", () => {
    const view = buildProjectView(base, {
      ...none,
      commits: new Map([[s1.commit!.hash, { ok: false, reason: "GitHub 404" }]]),
    });
    expect(view.steps[1]!.commit).toEqual(s1.commit);
  });

  it("página que falhou some da lista e o link para ela continua indo ao GitHub", () => {
    const view = buildProjectView(
      { ...base, pages: ["docs/a.md", "docs/b.md"] },
      {
        ...none,
        readme: { ok: true, value: { html: '<a href="docs/a.md">a</a> <a href="docs/b.md">b</a>', fetchedAt: "2026-10-23T12:00:00Z" } },
        pages: [
          { path: "docs/a.md", result: { ok: true, value: "<p>A</p>" } },
          { path: "docs/b.md", result: { ok: false, reason: "GitHub 404" } },
        ],
      },
    );
    if (view.readme.source !== "github") throw new Error("esperava README do GitHub");
    expect(view.readme.pages.map((p) => p.path)).toEqual(["docs/a.md"]);
    expect(view.readme.html).toContain('data-page="docs/a.md"');
    expect(view.readme.html).not.toContain('data-page="docs/b.md"');
  });
});
