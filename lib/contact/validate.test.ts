import { describe, expect, it } from "vitest";
import { emailSubject, mailtoHref, readContactForm, validateContact, type ContactValues } from "./validate";

const ok: ContactValues = { subject: "vaga", name: "Ana", email: "ana@empresa.com", message: "Olá, vi seu portfólio!" };

const form = (entries: Record<string, string>) => {
  const f = new FormData();
  Object.entries(entries).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("readContactForm", () => {
  it("apara espaços e ignora assunto fora da lista", () => {
    const v = readContactForm(form({ subject: "<script>", name: "  Ana ", email: " a@b.co ", message: " oi " }));
    expect(v).toEqual({ subject: "", name: "Ana", email: "a@b.co", message: "oi" });
  });

  it("campos ausentes viram string vazia", () => {
    expect(readContactForm(new FormData())).toEqual({ subject: "", name: "", email: "", message: "" });
  });
});

describe("validateContact", () => {
  it("aceita um envio completo", () => {
    expect(validateContact(ok)).toEqual({});
  });

  it("assunto é opcional", () => {
    expect(validateContact({ ...ok, subject: "" })).toEqual({});
  });

  it("aponta cada campo com problema", () => {
    const errors = validateContact({ subject: "", name: "", email: "ana@", message: "oi" });
    expect(Object.keys(errors).sort()).toEqual(["email", "message", "name"]);
  });

  it("limita o tamanho da mensagem", () => {
    expect(validateContact({ ...ok, message: "a".repeat(5001) }).message).toBeDefined();
  });
});

describe("assunto e mailto", () => {
  it("monta o assunto com a etiqueta do tipo de contato", () => {
    expect(emailSubject(ok)).toBe("[portfólio · vaga] Ana");
    expect(emailSubject({ ...ok, subject: "" })).toBe("[portfólio · contato] Ana");
  });

  it("codifica espaços como %20 no mailto", () => {
    const href = mailtoHref("eu@x.com", ok);
    expect(href.startsWith("mailto:eu@x.com?subject=")).toBe(true);
    expect(href).not.toContain("+");
  });
});
