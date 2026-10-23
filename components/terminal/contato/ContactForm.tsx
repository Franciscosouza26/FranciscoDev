"use client";

import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { sendContact, type ContactState } from "@/lib/contact/action";
import { LIMITS, mailtoHref, validateContact, type ContactField, type ContactValues, type Subject } from "@/lib/contact/validate";
import { CONTACT_SUBJECTS, contacts } from "@/lib/portfolio";
import { CopyEmail } from "./CopyEmail";

const EMPTY: ContactValues = { subject: "", name: "", email: "", message: "" };
const FIELDS: ContactField[] = ["name", "email", "message"];

const INPUT =
  "w-full border-b border-phosphor-faint bg-transparent px-1 py-1.5 caret-phosphor transition-colors placeholder:text-phosphor-faint focus:border-phosphor aria-invalid:border-danger";

/*
 * O formulário como o comando `mail` do terminal.
 *
 * Por que onSubmit + startTransition em vez de <form action={...}>: com `action`, o React limpa
 * o formulário depois de cada envio — inclusive quando o servidor recusa, e o visitante perderia
 * o texto. Aqui os campos são controlados e só limpam quando ele pede "escrever outra".
 *
 * Os erros só aparecem depois da primeira tentativa de envio (nada de vermelho enquanto a pessoa
 * ainda está digitando) e somem sozinhos conforme ela corrige.
 */
export function ContactForm() {
  const [state, dispatch, pending] = useActionState(sendContact, { status: "idle" } as ContactState);
  const [values, setValues] = useState(EMPTY);
  const [attempted, setAttempted] = useState(false);
  const [dismissed, setDismissed] = useState<ContactState | null>(null); // resultado já "fechado" pelo visitante

  const resultRef = useRef<HTMLDivElement>(null);
  const errors = attempted ? validateContact(values) : {};
  const result = state === dismissed || pending ? null : state;

  // resultado novo: leva o foco até ele (no sucesso o formulário some, e o foco não pode cair no vazio)
  useEffect(() => {
    if (state.status === "sent" || state.status === "failed") resultRef.current?.focus();
  }, [state]);

  const set = (field: keyof ContactValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    setAttempted(true);
    const invalid = FIELDS.find((f) => validateContact(values)[f]);
    if (invalid) {
      document.getElementById(`contact-${invalid}`)?.focus();
      return;
    }
    const data = new FormData(e.currentTarget);
    startTransition(() => dispatch(data));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.currentTarget.requestSubmit();
    }
  };

  const reset = () => {
    setValues(EMPTY);
    setAttempted(false);
    setDismissed(state);
  };

  return (
    <section aria-labelledby="mail-title" className="border border-phosphor-dim">
      <div className="flex items-baseline justify-between gap-2 border-b border-phosphor-faint px-3 py-1 text-xs text-phosphor-dim">
        <h3 id="mail-title">$ mail -s</h3>
        <span>para: {contacts.email.split("@")[0]}</span>
      </div>

      {result?.status === "sent" ? (
        <div ref={resultRef} tabIndex={-1} className="space-y-2 p-3 text-sm sm:p-4">
          <p className="text-mint">250 OK — mensagem enviada.</p>
          <p className="text-phosphor-dim">
            Obrigado, {values.name.split(" ")[0]}! Respondo em até {contacts.responseTime} no {values.email}.
          </p>
          <button type="button" onClick={reset} className="cursor-pointer text-mint underline decoration-phosphor-dim underline-offset-4 hover:bg-phosphor hover:text-void">
            escrever outra
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={submit} onKeyDown={onKeyDown} className="space-y-3 p-3 text-sm sm:p-4">
          <fieldset>
            <legend className="sr-only">Assunto (opcional)</legend>
            <div className="grid grid-cols-[9ch_1fr] items-center">
              <span aria-hidden="true" className="text-phosphor-dim">
                assunto:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.entries(CONTACT_SUBJECTS) as [Subject, string][]).map(([id, label]) => (
                  <label
                    key={id}
                    className="flex min-h-9 cursor-pointer items-center border border-phosphor-faint px-2.5 text-xs transition-colors hover:border-phosphor-dim has-checked:border-phosphor has-checked:bg-phosphor has-checked:text-void has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-mint sm:min-h-7"
                  >
                    <input
                      type="radio"
                      name="subject"
                      value={id}
                      checked={values.subject === id}
                      onChange={set("subject")}
                      className="sr-only"
                    />
                    [{label}]
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          <Field id="name" label="nome:" error={errors.name}>
            <input
              id="contact-name"
              name="name"
              value={values.name}
              onChange={set("name")}
              autoComplete="name"
              maxLength={LIMITS.name}
              placeholder="seu nome"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "contact-name-error" : undefined}
              className={INPUT}
            />
          </Field>

          <Field id="email" label="email:" error={errors.email}>
            <input
              id="contact-email"
              name="email"
              type="email"
              value={values.email}
              onChange={set("email")}
              autoComplete="email"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={LIMITS.email}
              placeholder="para eu responder"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "contact-email-error" : undefined}
              className={INPUT}
            />
          </Field>

          <Field id="message" label="msg:" error={errors.message}>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              value={values.message}
              onChange={set("message")}
              maxLength={LIMITS.message}
              placeholder="conte sobre a vaga, o projeto ou a ideia"
              aria-invalid={Boolean(errors.message)}
              aria-describedby={`contact-message-count${errors.message ? " contact-message-error" : ""}`}
              className={`${INPUT} resize-y`}
            />
            <p id="contact-message-count" className="text-right text-xs text-phosphor-dim tabular-nums">
              {values.message.length}/{LIMITS.message}
            </p>
          </Field>

          {/* honeypot: invisível para pessoas e leitores de tela, irresistível para robôs de spam */}
          <div aria-hidden="true" className="sr-only">
            <label>
              website
              <input name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
            <span className="hidden text-xs text-phosphor-dim sm:inline">Ctrl+Enter envia</span>
            <button
              type="submit"
              aria-disabled={pending}
              className="min-h-11 cursor-pointer border border-phosphor px-4 text-mint transition-colors hover:bg-phosphor hover:text-void aria-disabled:cursor-wait aria-disabled:opacity-60 sm:min-h-9"
            >
              {pending ? "enviando…" : "[ enviar ⏎ ]"}
            </button>
          </div>

          {result?.status === "failed" && (
            <div ref={resultRef} tabIndex={-1} className="space-y-2 border-t border-phosphor-faint pt-3">
              <p className="text-danger">550 não enviado: {result.reason}.</p>
              <p className="text-phosphor-dim">Sua mensagem continua aqui. Envie pelo seu app de e-mail:</p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={mailtoHref(contacts.email, values)}
                  className="flex min-h-9 items-center border border-phosphor-dim px-2 text-xs text-mint transition-colors hover:bg-phosphor hover:text-void sm:min-h-7"
                >
                  abrir já preenchido ↗
                </a>
                <CopyEmail label="copiar endereço" />
              </div>
            </div>
          )}
        </form>
      )}

      {/* sempre no DOM: leitores de tela só anunciam mudanças numa região que já existia */}
      <p role="status" className="sr-only">
        {pending ? "Enviando mensagem…" : result?.status === "sent" ? "Mensagem enviada." : result?.status === "failed" ? `Não enviado: ${result.reason}.` : ""}
      </p>
    </section>
  );
}

function Field({ id, label, error, children }: { id: ContactField; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9ch_1fr] items-start">
      <label htmlFor={`contact-${id}`} className="pt-1.5 text-phosphor-dim">
        {label}
      </label>
      <div className="min-w-0 space-y-1">
        {children}
        {error && (
          <p id={`contact-${id}-error`} className="text-xs text-danger">
            ↳ {error}
          </p>
        )}
      </div>
    </div>
  );
}
