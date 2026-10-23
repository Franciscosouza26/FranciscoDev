import { CONTACT_SUBJECTS } from "@/lib/portfolio";

/*
 * Validação do formulário de contato. Arquivo puro (sem "use server", sem DOM) porque roda
 * nos dois lados: no navegador dá o erro na hora, sem ida ao servidor; no servidor é a
 * validação que vale — a Server Action é um endpoint POST público, qualquer um pode chamá-la
 * sem passar pelo formulário.
 */

export type Subject = keyof typeof CONTACT_SUBJECTS;
export type ContactField = "name" | "email" | "message";
export type ContactValues = { subject: Subject | ""; name: string; email: string; message: string };
export type ContactErrors = Partial<Record<ContactField, string>>;

export const LIMITS = { name: 100, email: 200, messageMin: 10, message: 5000 } as const;

// propositalmente simples: "algo@algo.algo" — validação completa de e-mail é o próprio envio
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readContactForm(form: FormData): ContactValues {
  const text = (key: string) => {
    const value = form.get(key);
    return typeof value === "string" ? value.trim() : "";
  };
  const subject = text("subject");
  return {
    subject: subject in CONTACT_SUBJECTS ? (subject as Subject) : "",
    name: text("name"),
    email: text("email"),
    message: text("message"),
  };
}

export function validateContact(v: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!v.name) errors.name = "diga seu nome";
  else if (v.name.length > LIMITS.name) errors.name = `nome com até ${LIMITS.name} caracteres`;

  if (!v.email) errors.email = "informe um e-mail para eu responder";
  else if (v.email.length > LIMITS.email || !EMAIL_RE.test(v.email)) errors.email = "e-mail inválido (ex.: voce@empresa.com)";

  if (v.message.length < LIMITS.messageMin) errors.message = `escreva pelo menos ${LIMITS.messageMin} caracteres`;
  else if (v.message.length > LIMITS.message) errors.message = `mensagem com até ${LIMITS.message} caracteres`;
  return errors;
}

/** Assunto do e-mail que chega na caixa do Francisco — fácil de filtrar: "[portfólio · vaga] Ana". */
export function emailSubject(v: ContactValues) {
  const tag = v.subject ? CONTACT_SUBJECTS[v.subject] : "contato";
  return `[portfólio · ${tag}] ${v.name}`;
}

/** Fallback sem servidor: abre o app de e-mail do visitante com tudo já preenchido. */
export function mailtoHref(to: string, v: ContactValues) {
  const params = new URLSearchParams({ subject: emailSubject(v), body: v.message });
  // URLSearchParams codifica espaço como "+", que vários apps de e-mail mostram literalmente
  return `mailto:${to}?${params.toString().replaceAll("+", "%20")}`;
}
