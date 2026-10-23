"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { profile } from "@/lib/portfolio";
import { useClock, usePrefersReducedMotion } from "@/lib/hooks";
import type { GitHubProfile } from "@/lib/github/profile";
import type { ProjectView } from "@/lib/projects/types";
import { MatrixRain } from "./MatrixRain";
import { Ajuda, Matrix, NotFound, Sobre, Stack, Sudo, type Go } from "./views";
import { ContactView } from "./contato/ContactView";
import { ProjectsView } from "./projetos/ProjectsView";

const NAV = ["sobre", "projetos", "stack", "contato"] as const;
type Section = (typeof NAV)[number];

const COMMANDS = [...NAV, "ajuda", "limpar"];
const ALIASES: Record<string, string> = {
  help: "ajuda",
  "?": "ajuda",
  about: "sobre",
  whoami: "sobre",
  projects: "projetos",
  ls: "projetos",
  contact: "contato",
  clear: "limpar",
  cls: "limpar",
};

const BOOT = [
  "conectando à matrix...",
  "rastreando sinal ........ ok",
  "carregando react@19 ..... ok",
  "acesso concedido.",
];

type Screen = {
  id: number;
  command: string;
  view: Section | "ajuda" | "vazio" | "sudo" | "matrix" | "notfound";
  arg?: string;
};

const TYPE_MS = 35;

/** `ready`: o boot só começa quando a intro do retrato termina. `projects` vem do servidor (GitHub + fallback). */
export function Terminal({
  ready = true,
  projects,
  github,
}: {
  ready?: boolean;
  projects: ProjectView[];
  github: GitHubProfile | null;
}) {
  const reduce = usePrefersReducedMotion();
  const clock = useClock();

  const [bootStep, setBootStep] = useState(0);
  const [screen, setScreen] = useState<Screen | null>(null);
  const [input, setInput] = useState("");
  const [autoTyping, setAutoTyping] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(0);
  const [intense, setIntense] = useState(false);

  const timers = useRef<number[]>([]);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const run = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setHistory((h) => [...h, value]);
    setHistoryIdx(history.length + 1);

    const [first, ...rest] = value.toLowerCase().split(/\s+/);
    const name = ALIASES[first] ?? first;
    const arg = rest.join(" ");
    const id = Date.now();

    if ((NAV as readonly string[]).includes(name) || name === "ajuda") {
      setScreen({ id, command: value, view: name as Screen["view"] });
    } else if (name === "limpar") {
      setScreen({ id, command: value, view: "vazio" });
    } else if (name === "sudo") {
      setScreen({ id, command: value, view: "sudo", arg });
    } else if (name === "matrix") {
      setScreen({ id, command: value, view: "matrix" });
      setIntense(true);
      later(() => setIntense(false), 4000);
    } else {
      const suggestion = COMMANDS.find((c) => c.startsWith(name.slice(0, 2)));
      setScreen({ id, command: value, view: "notfound", arg: suggestion });
    }
  };

  /** Usado pelo menu e pelos links: "digita" o comando no prompt antes de rodar — ensina o atalho. */
  const go: Go = (command) => {
    if (autoTyping !== null) return;
    setInput("");
    if (reduce) {
      run(command);
      return;
    }
    for (let i = 1; i <= command.length; i++) {
      later(() => setAutoTyping(command.slice(0, i)), i * TYPE_MS);
    }
    later(() => {
      setAutoTyping(null);
      run(command);
    }, command.length * TYPE_MS + 140);
  };

  const finishBoot = () => {
    clearTimers();
    setBootStep(BOOT.length);
    run("sobre");
  };

  // sequência de boot curta; qualquer tecla ou clique pula
  useEffect(() => {
    if (!ready) return;
    const step = reduce ? 0 : 260;
    BOOT.forEach((_, i) => later(() => setBootStep(i + 1), step * (i + 1)));
    later(finishBoot, step * (BOOT.length + 1) + (reduce ? 0 : 200));
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma única vez, quando fica pronto
  }, [ready]);

  // atalhos globais: 1–4 trocam de seção; qualquer letra foca o prompt
  const onGlobalKey = useEffectEvent((e: globalThis.KeyboardEvent) => {
    if (!ready) return;
    if (!screen) {
      finishBoot();
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    // digitando num campo (o prompt ou o formulário de contato): as teclas são do campo, não atalhos
    if (target.closest("input, textarea, select, [contenteditable]")) return;
    const n = Number(e.key);
    if (n >= 1 && n <= NAV.length) {
      e.preventDefault();
      go(NAV[n - 1]);
    } else if (e.key.length === 1 && target.tagName !== "BUTTON" && target.tagName !== "A") {
      inputRef.current?.focus();
    }
  });
  const onGlobalPointer = useEffectEvent(() => {
    if (ready && !screen) finishBoot();
  });

  useEffect(() => {
    const key = (e: globalThis.KeyboardEvent) => onGlobalKey(e);
    const pointer = () => onGlobalPointer();
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", pointer);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", pointer);
    };
  }, []);

  // nova tela começa do topo
  useEffect(() => {
    outputRef.current?.scrollTo({ top: 0 });
  }, [screen?.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (autoTyping !== null) return;
    run(input);
    setInput("");
  };

  const suggestion = input ? COMMANDS.find((c) => c.startsWith(input.toLowerCase()) && c !== input) : undefined;

  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp" && history.length) {
      e.preventDefault();
      const i = Math.max(0, historyIdx - 1);
      setHistoryIdx(i);
      setInput(history[i]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const i = Math.min(history.length, historyIdx + 1);
      setHistoryIdx(i);
      setInput(history[i] ?? "");
    } else if ((e.key === "Tab" || e.key === "ArrowRight") && suggestion) {
      e.preventDefault();
      setInput(suggestion);
    } else if (e.key === "Escape") {
      setInput("");
    }
  };

  const current = screen && (NAV as readonly string[]).includes(screen.view) ? (screen.view as Section) : null;
  const shown = autoTyping ?? input;

  return (
    <>
      <MatrixRain intense={intense} />

      <div className="relative z-10 flex min-h-svh items-center justify-center p-2 sm:p-6 lg:p-10">
        <h1 className="sr-only">{profile.name} — portfólio</h1>

        <div className="flex h-[calc(100svh-1rem)] w-full max-w-5xl flex-col rounded-2xl border border-phosphor-faint bg-void/80 p-2 shadow-[0_0_80px_-20px_oklch(0.87_0.21_145/0.35)] backdrop-blur-sm sm:h-[min(820px,calc(100svh-3rem))] sm:p-2.5">
          {/* barra de título */}
          <div aria-hidden="true" className="flex items-center gap-2 px-2 pb-2 pt-1 text-xs text-phosphor-dim">
            <span className="size-3 rounded-full bg-phosphor-faint" />
            <span className="size-3 rounded-full bg-phosphor-faint" />
            <span className="size-3 rounded-full bg-phosphor" />
            <span className="mx-auto -translate-x-6 truncate">
              {profile.handle}@matrix: ~/{current ?? ""}
            </span>
          </div>

          <div className="crt-screen relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl">
            <div className="crt-sweep" aria-hidden="true" />

            {/* menu: as seções ficam sempre visíveis, sem precisar decorar comandos */}
            <nav aria-label="Seções" className="relative z-5 flex gap-0.5 overflow-x-auto border-b border-phosphor-faint px-2 py-2 sm:gap-1 sm:px-5">
              {NAV.map((s, i) => {
                const active = current === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => go(s)}
                    aria-current={active ? "page" : undefined}
                    className={`shrink-0 cursor-pointer rounded-sm px-2 py-1.5 text-sm sm:px-3 transition-colors ${
                      active ? "bg-phosphor text-void" : "text-phosphor hover:bg-phosphor-faint/60"
                    }`}
                  >
                    <span className={`mr-1.5 hidden sm:inline ${active ? "text-void/70" : "text-phosphor-dim"}`}>
                      {i + 1}
                    </span>
                    {s}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => go("ajuda")}
                className="ml-auto shrink-0 cursor-pointer rounded-sm px-2 py-1.5 text-sm sm:px-3 text-phosphor-dim transition-colors hover:text-phosphor"
              >
                ?<span className="hidden sm:inline"> ajuda</span>
              </button>
            </nav>

            {/* saída */}
            <div
              ref={outputRef}
              className="crt-glow relative min-h-0 flex-1 overflow-y-auto px-4 py-5 leading-relaxed sm:px-8 sm:py-7"
              style={{ scrollbarColor: "var(--color-phosphor-faint) transparent", scrollbarWidth: "thin" }}
            >
              {!screen ? (
                <div className="space-y-1 text-phosphor-dim">
                  {BOOT.slice(0, bootStep).map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                  <p className="pt-4 text-xs opacity-70">pressione qualquer tecla para pular</p>
                </div>
              ) : (
                <div key={screen.id} className="space-y-3">
                  <p className="text-phosphor-dim">
                    <span className="text-mint">{profile.handle}</span>@matrix:~$ {screen.command}
                  </p>
                  <ScreenView screen={screen} go={go} projects={projects} github={github} />
                </div>
              )}
            </div>

            {/* prompt: opcional — dá pra navegar só com cliques */}
            <form
              onSubmit={submit}
              onClick={() => inputRef.current?.focus()}
              className="crt-glow relative z-5 flex items-baseline gap-2 border-t border-phosphor-faint px-4 py-3 sm:px-8"
            >
              <label htmlFor="cmd" className="shrink-0 text-mint">
                {profile.handle}
                <span className="text-phosphor-dim">:~$</span>
              </label>
              <div className="relative min-w-0 flex-1">
                <input
                  id="cmd"
                  ref={inputRef}
                  value={shown}
                  readOnly={autoTyping !== null}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onInputKey}
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  aria-describedby="cmd-hint"
                  className="w-full bg-transparent text-transparent caret-transparent outline-none"
                />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre">
                  {shown}
                  {suggestion && !autoTyping && <span className="text-phosphor-faint">{suggestion.slice(input.length)}</span>}
                  <span className="animate-caret inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-phosphor shadow-[0_0_8px_var(--color-phosphor)]" />
                  {!shown && (
                    <span className="ml-2 text-phosphor-dim">digite um comando<span className="hidden sm:inline"> ou use o menu</span></span>
                  )}
                </div>
              </div>
              <p id="cmd-hint" className="sr-only">
                Comandos: sobre, projetos, stack, contato, ajuda. Tab completa, setas navegam no histórico.
              </p>
            </form>
          </div>

          {/* barra de status */}
          <div className="flex items-center justify-between gap-4 px-2 pt-2 text-xs text-phosphor-dim">
            <span className="flex items-center gap-2">
              <span className="animate-pulse-dot size-1.5 rounded-full bg-phosphor" aria-hidden="true" />
              conectado
            </span>
            <span className="hidden sm:inline">Tab completa · ↑↓ histórico · 1–4 seções</span>
            <time className="tabular-nums" suppressHydrationWarning>
              {clock || "--:--:--"} BRT
            </time>
          </div>
        </div>
      </div>

      <p role="status" className="sr-only">
        {screen ? `Mostrando ${screen.view}` : "Carregando"}
      </p>
    </>
  );
}

function ScreenView({
  screen,
  go,
  projects,
  github,
}: {
  screen: Screen;
  go: Go;
  projects: ProjectView[];
  github: GitHubProfile | null;
}) {
  switch (screen.view) {
    case "sobre":
      return <Sobre go={go} />;
    case "projetos":
      return <ProjectsView go={go} projects={projects} />;
    case "stack":
      return <Stack go={go} />;
    case "contato":
      return <ContactView go={go} github={github} />;
    case "ajuda":
      return <Ajuda go={go} />;
    case "sudo":
      return <Sudo go={go} arg={screen.arg ?? ""} />;
    case "matrix":
      return <Matrix go={go} />;
    case "notfound":
      return <NotFound go={go} command={screen.command} suggestion={screen.arg} />;
    case "vazio":
      return null;
  }
}
