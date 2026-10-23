"use client";

import type { GitHubProfile } from "@/lib/github/profile";
import { contacts, profile } from "@/lib/portfolio";
import { Heading, Next, TypeOut, type Go } from "../views";
import { ContactForm } from "./ContactForm";
import { CopyEmail } from "./CopyEmail";

/*
 * Contato = o fim do funil. A tela responde, nesta ordem:
 * 1. vale a pena escrever? (status, fuso, prazo de resposta)
 * 2. como? (formulário que envia daqui mesmo — a ação principal)
 * 3. e se eu preferir outro canal? (e-mail em destaque; GitHub como prova de trabalho)
 */
export function ContactView({ go, github }: { go: Go; github: GitHubProfile | null }) {
  return (
    <TypeOut>
      <Heading>~/contato</Heading>
      <p className="text-sm text-phosphor-dim">
        <span className="animate-pulse-dot mr-2 inline-block size-2 -translate-y-px rounded-full bg-phosphor shadow-[0_0_10px_var(--color-phosphor)]" />
        <span className="text-phosphor">{profile.status}</span> · {contacts.location} · respondo em até{" "}
        {contacts.responseTime}
      </p>
      <p className="max-w-[68ch]">Tem um projeto, vaga ou ideia? Escreva aqui mesmo: a mensagem chega direto no meu e-mail.</p>

      {/*
        No DOM o formulário vem antes dos canais: no celular ele é a primeira coisa depois do texto,
        porque é a ação principal. No desktop o grid devolve os canais para a esquerda.
      */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="lg:col-start-2 lg:row-start-1">
          <ContactForm />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <Channels github={github} />
        </div>
      </div>

      <Next go={go} commands={["sobre", "projetos"]} />
    </TypeOut>
  );
}

const pushDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "America/Sao_Paulo" });

function Channels({ github }: { github: GitHubProfile | null }) {
  const [linkedin, gh] = contacts.links;

  return (
    <section aria-labelledby="canais-title" className="border border-phosphor-faint text-sm">
      <h3 id="canais-title" className="border-b border-phosphor-faint px-3 py-1 text-xs text-phosphor-dim">
        canais
      </h3>
      <ul className="divide-y divide-phosphor-faint">
        <li className="space-y-1.5 px-3 py-2.5">
          <p className="text-xs text-phosphor-dim">▸ email · o mais rápido</p>
          <a className="block break-all text-mint underline-offset-4 hover:underline" href={`mailto:${contacts.email}`}>
            {contacts.email}
          </a>
          <div className="flex flex-wrap gap-2">
            <CopyEmail />
          </div>
        </li>
        <li className="space-y-1 px-3 py-2.5">
          <p className="text-xs text-phosphor-dim">▸ {linkedin.label}</p>
          <a className="block break-all text-mint underline-offset-4 hover:underline" href={linkedin.href} target="_blank" rel="noreferrer">
            {linkedin.display} ↗
          </a>
        </li>
        <li className="space-y-1 px-3 py-2.5">
          <p className="text-xs text-phosphor-dim">▸ {gh.label} · o código dos projetos</p>
          <a className="block break-all text-mint underline-offset-4 hover:underline" href={gh.href} target="_blank" rel="noreferrer">
            {gh.display} ↗
          </a>
          {/* sem números quando a API falha: melhor nada do que um "0 repos" falso */}
          {github && (
            <p className="text-xs text-phosphor-dim tabular-nums">
              └ {github.publicRepos} repos públicos
              {github.lastPush && (
                <>
                  {" "}
                  · último push {pushDate.format(new Date(github.lastPush.at))} em{" "}
                  <span className="text-phosphor">{github.lastPush.repo}</span>
                </>
              )}
            </p>
          )}
        </li>
      </ul>
    </section>
  );
}
