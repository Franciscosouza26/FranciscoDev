import { describe, expect, it } from "vitest";
import { checkEmbeddable } from "./embed";

const h = (init: Record<string, string>) => new Headers(init);
const SITE = "https://francisco.vercel.app";

describe("checkEmbeddable", () => {
  it("sem headers de proteção, pode embutir", () => {
    expect(checkEmbeddable(h({})).embeddable).toBe(true);
  });

  it("X-Frame-Options DENY/SAMEORIGIN bloqueiam", () => {
    expect(checkEmbeddable(h({ "x-frame-options": "DENY" })).embeddable).toBe(false);
    expect(checkEmbeddable(h({ "x-frame-options": "sameorigin" })).embeddable).toBe(false);
  });

  it("frame-ancestors 'none' bloqueia", () => {
    expect(checkEmbeddable(h({ "content-security-policy": "default-src 'self'; frame-ancestors 'none'" })).embeddable).toBe(false);
  });

  it("frame-ancestors listando o portfólio libera — e vence o X-Frame-Options", () => {
    const headers = h({ "content-security-policy": `frame-ancestors 'self' ${SITE}`, "x-frame-options": "SAMEORIGIN" });
    expect(checkEmbeddable(headers, SITE).embeddable).toBe(true);
  });

  it("wildcard de subdomínio casa", () => {
    expect(checkEmbeddable(h({ "content-security-policy": "frame-ancestors https://*.vercel.app" }), SITE).embeddable).toBe(true);
  });

  it("frame-ancestors restrito sem SITE_URL configurado bloqueia", () => {
    expect(checkEmbeddable(h({ "content-security-policy": `frame-ancestors ${SITE}` })).embeddable).toBe(false);
  });
});
