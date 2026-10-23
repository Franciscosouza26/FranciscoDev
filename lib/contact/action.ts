"use server";

import { contacts } from "@/lib/portfolio";
import { emailSubject, readContactForm, validateContact, type ContactErrors } from "./validate";

/*
 * Envio do formulário de contato pelo Resend (API REST, sem SDK — o mesmo padrão do cliente do GitHub).
 *
 * Variáveis de ambiente (.env.local):
 * - RESEND_API_KEY  obrigatória; sem ela o formulário responde "indisponível" e a tela oferece o mailto.
 * - CONTACT_FROM    opcional; sem domínio próprio verificado, o Resend só envia de onboarding@resend.dev
 *                   e só para o e-mail dono da conta — que é exatamente o caso aqui.
 *
 * Segurança: isto é um endpoint POST público. Por isso a validação é refeita aqui, o e-mail sai só
 * como texto puro (nada do visitante vira HTML) e o destinatário é fixo — o visitante nunca escolhe para quem envia.
 */

export type ContactState =
  | { status: "idle" }
  | { status: "invalid"; errors: ContactErrors }
  | { status: "sent" }
  | { status: "failed"; reason: string };

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 8000;
const DEFAULT_FROM = "Portfólio <onboarding@resend.dev>";

export async function sendContact(_prev: ContactState, form: FormData): Promise<ContactState> {
  // honeypot: campo invisível que só robô preenche. Responde "enviado" para o robô não tentar de novo.
  if (form.get("website")) return { status: "sent" };

  const values = readContactForm(form);
  const errors = validateContact(values);
  if (Object.keys(errors).length) return { status: "invalid", errors };

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[contato] RESEND_API_KEY ausente — formulário em modo mailto");
    return { status: "failed", reason: "envio pelo site indisponível no momento" };
  }

  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM ?? DEFAULT_FROM,
        to: [contacts.email],
        reply_to: values.email, // "responder" no Gmail já vai direto para o visitante
        subject: emailSubject(values),
        text: `${values.message}\n\n— ${values.name} <${values.email}>`,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      // o motivo detalhado fica no log do servidor; o visitante recebe uma frase genérica
      console.warn(`[contato] Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
      return { status: "failed", reason: "o servidor de e-mail recusou o envio" };
    }
    return { status: "sent" };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    console.warn(`[contato] falha no envio: ${timeout ? "timeout" : String(error)}`);
    return { status: "failed", reason: timeout ? "o servidor de e-mail não respondeu a tempo" : "falha de conexão" };
  }
}
