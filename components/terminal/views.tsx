"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { LEVEL_LABEL, profile, stack } from "@/lib/portfolio";

export type Go = (command: string) => void;

const ASCII = ` ███████╗██████╗  █████╗ ███╗   ██╗ ██████╗██╗███████╗ ██████╗ ██████╗
 ██╔════╝██╔══██╗██╔══██╗████╗  ██║██╔════╝██║██╔════╝██╔════╝██╔═══██╗
 █████╗  ██████╔╝███████║██╔██╗ ██║██║     ██║███████╗██║     ██║   ██║
 ██╔══╝  ██╔══██╗██╔══██║██║╚██╗██║██║     ██║╚════██║██║     ██║   ██║
 ██║     ██║  ██║██║  ██║██║ ╚████║╚██████╗██║███████║╚██████╗╚██████╔╝
 ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝╚═╝╚══════╝ ╚═════╝ ╚═════╝`;

/**
 * Arte ASCII que sempre cabe na largura do terminal.
 * Mede a largura real (depende da fonte do sistema) e ajusta o font-size — sem setState, direto no DOM.
 */
function AsciiArt() {
  const ref = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const pre = ref.current;
    const box = pre?.parentElement;
    if (!pre || !box) return;
    const fit = () => {
      pre.style.fontSize = "10px";
      const natural = pre.scrollWidth;
      pre.style.fontSize = `${Math.min(13, (10 * box.clientWidth) / natural)}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <pre ref={ref} aria-hidden="true" className="ascii mb-3 w-max font-bold text-mint">
      {ASCII}
    </pre>
  );
}

/*
 * Digita a saída de cada tela como a resposta de um comando: o texto aparece caractere
 * por caractere, na ordem de leitura, com um cursor em bloco — e fica na tela.
 *
 * Por que mexer direto nos nós de texto: assim qualquer tela (parágrafos, links, a arte
 * ASCII, a lista de stack) ganha o efeito sem reescrever o JSX em pedaços. O React não
 * percebe: só troca o conteúdo de um nó de texto quando o valor dele muda, e ao final
 * cada nó volta exatamente ao texto original.
 *
 * Não é "movimento" (nada se desloca), então roda também com Reduzir Movimento.
 * Qualquer tecla ou clique completa a digitação na hora.
 *
 * `data-typeout-skip`: blocos cujo texto muda sozinho logo ao montar (o boot do preview de
 * projetos, por ex.) não são digitados — o React reescreveria os nós no meio da digitação.
 * Eles ficam ocultos e aparecem inteiros quando a digitação chega neles.
 */
const CHARS_PER_SEC = 650;
const MAX_TYPE_MS = 1800; // telas longas aceleram para nunca passar disso

export function TypeOut({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor) return;

    const skipped = Array.from(root.querySelectorAll<HTMLElement>("[data-typeout-skip]"));
    const inSkipped = (n: Node) => skipped.some((s) => s !== n && s.contains(n));

    const nodes: Text[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      // o próprio cursor, textos invisíveis (sr-only) e blocos pulados não são digitados
      if (n.parentElement?.closest(".sr-only") || inSkipped(n)) continue;
      if (n.nodeValue?.trim()) nodes.push(n as Text);
    }
    const full = nodes.map((n) => n.nodeValue ?? "");
    const total = full.reduce((sum, t) => sum + t.length, 0);
    if (!total) return;

    // elementos sem texto (o ponto de status, por ex.) e blocos pulados só aparecem quando a digitação os alcança
    const leaves = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      (el) => el !== cursor && el.childElementCount === 0 && !el.textContent?.trim() && !inSkipped(el),
    );
    const marks = [...leaves, ...skipped]
      .map((el) => {
        const at = nodes.findIndex((n) => el.compareDocumentPosition(n) & Node.DOCUMENT_POSITION_FOLLOWING);
        el.style.visibility = "hidden";
        return { el, at: at < 0 ? nodes.length : at };
      });

    nodes.forEach((n) => (n.nodeValue = ""));
    root.setAttribute("aria-busy", "true");

    const rate = Math.max(CHARS_PER_SEC, (total * 1000) / MAX_TYPE_MS);
    const range = document.createRange();
    let raf = 0;
    let start = 0;
    let done = false;

    const placeCursor = (node: Text, offset: number) => {
      if (!offset) return;
      range.setStart(node, offset - 1);
      range.setEnd(node, offset);
      const rects = range.getClientRects();
      const r = rects[rects.length - 1];
      if (!r) return;
      const box = root.getBoundingClientRect();
      cursor.style.opacity = "1";
      cursor.style.height = `${r.height}px`;
      cursor.style.width = `${Math.max(6, r.height * 0.5)}px`;
      cursor.style.transform = `translate(${r.right - box.left + 1}px, ${r.top - box.top}px)`;
    };

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      nodes.forEach((n, i) => (n.nodeValue = full[i]));
      marks.forEach((m) => m.el.style.removeProperty("visibility"));
      cursor.style.opacity = "0";
      root.removeAttribute("aria-busy");
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };

    const step = (now: number) => {
      if (!start) start = now;
      let left = Math.floor(((now - start) / 1000) * rate);
      let last: Text | null = null;
      let lastOffset = 0;
      let reached = 0;
      for (let i = 0; i < nodes.length; i++) {
        const take = Math.min(full[i].length, left);
        if (nodes[i].nodeValue!.length !== take) nodes[i].nodeValue = full[i].slice(0, take);
        left -= take;
        if (take > 0) {
          last = nodes[i];
          lastOffset = take;
          reached = i;
        }
        if (left <= 0) break;
      }
      if (left > 0) return finish();
      for (const m of marks) if (m.at <= reached && last) m.el.style.removeProperty("visibility");
      if (last) placeCursor(last, lastOffset);
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);
    return finish; // ao desmontar (ou no duplo efeito do StrictMode) devolve o texto inteiro
  }, []);

  return (
    <div ref={rootRef} className="relative space-y-3">
      {children}
      <span
        ref={cursorRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 bg-phosphor opacity-0 shadow-[0_0_8px_var(--color-phosphor)]"
      />
    </div>
  );
}

/** Comando clicável dentro do texto — ensina o comando enquanto navega. */
export function Cmd({ go, children }: { go: Go; children: string }) {
  return (
    <button
      type="button"
      onClick={() => go(children)}
      className="cursor-pointer rounded-sm px-1 text-mint underline decoration-phosphor-dim underline-offset-4 transition-colors hover:bg-phosphor hover:text-void"
    >
      {children}
    </button>
  );
}

export function Heading({ children }: { children: ReactNode }) {
  return <h2 className="mb-1 text-mint">{children}</h2>;
}

export function Next({ go, commands }: { go: Go; commands: string[] }) {
  return (
    <p className="mt-4 text-phosphor-dim">
      próximo →{" "}
      {commands.map((c) => (
        <span key={c} className="mr-2">
          <Cmd go={go}>{c}</Cmd>
        </span>
      ))}
    </p>
  );
}

export function Sobre({ go }: { go: Go }) {
  return (
    <TypeOut>
      <AsciiArt />
      <h2 className="text-lg text-mint sm:text-xl">
        {profile.name} <span className="text-phosphor-dim">—</span> {profile.role}
      </h2>
      <div className="max-w-[68ch] space-y-1">
        {profile.intro.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <p className="text-phosphor-dim">
        <span className="animate-pulse-dot mr-2 inline-block size-2 -translate-y-px rounded-full bg-phosphor shadow-[0_0_10px_var(--color-phosphor)]" />
        status: <span className="text-phosphor">{profile.status}</span>
      </p>
      <Next go={go} commands={["projetos", "contato"]} />
    </TypeOut>
  );
}

export function Stack({ go }: { go: Go }) {
  return (
    <TypeOut>
      <Heading>~/stack</Heading>
      <div className="grid gap-6 md:grid-cols-3">
        {stack.map((g) => (
          <div key={g.group}>
            <h3 className="mb-2 text-phosphor-dim">{"// "}{g.group}</h3>
            <ul className="space-y-1">
              {g.skills.map((s) => (
                <li key={s.name} className="flex flex-wrap justify-between gap-x-3">
                  <span>{s.name}</span>
                  <span className="text-phosphor-dim">
                    <span aria-hidden="true" className="text-phosphor">
                      {"■".repeat(s.level)}
                      <span className="text-phosphor-faint">{"□".repeat(5 - s.level)}</span>
                    </span>{" "}
                    {LEVEL_LABEL[s.level]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Next go={go} commands={["projetos", "contato"]} />
    </TypeOut>
  );
}

const HELP: [string, string][] = [
  ["sobre", "quem sou eu"],
  ["projetos", "o que eu construí"],
  ["stack", "tecnologias que uso"],
  ["contato", "como falar comigo"],
  ["limpar", "limpa a tela"],
];

export function Ajuda({ go }: { go: Go }) {
  return (
    <TypeOut>
      <Heading>comandos</Heading>
      <ul>
        {HELP.map(([c, d]) => (
          <li key={c} className="grid grid-cols-[12ch_1fr]">
            <span>
              <Cmd go={go}>{c}</Cmd>
            </span>
            <span className="text-phosphor-dim">{d}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-phosphor-dim">
        atalhos: teclas <span className="text-phosphor">1–4</span> trocam de seção ·{" "}
        <span className="text-phosphor">Tab</span> completa · <span className="text-phosphor">↑ ↓</span> histórico
      </p>
      <p className="text-phosphor-dim">psst… existem comandos secretos.</p>
    </TypeOut>
  );
}

export function NotFound({ go, command, suggestion }: { go: Go; command: string; suggestion?: string }) {
  return (
    <TypeOut>
      <p className="text-danger">comando não encontrado: {command}</p>
      <p className="text-phosphor-dim">
        {suggestion ? (
          <>
            você quis dizer <Cmd go={go}>{suggestion}</Cmd>?{" "}
          </>
        ) : null}
        digite <Cmd go={go}>ajuda</Cmd> para ver os comandos.
      </p>
    </TypeOut>
  );
}

export function Sudo({ go, arg }: { go: Go; arg: string }) {
  if (arg.startsWith("contratar")) {
    return (
      <TypeOut>
        <p className="text-phosphor-dim">[sudo] senha para recrutador: ********</p>
        <p className="text-mint">✔ permissão concedida. ótima escolha.</p>
        <Next go={go} commands={["contato"]} />
      </TypeOut>
    );
  }
  return (
    <TypeOut>
      <p className="text-danger">permissão negada. este incidente será reportado. 👀</p>
      <p className="text-phosphor-dim">
        (dica: tente <span className="text-phosphor">sudo contratar</span>)
      </p>
    </TypeOut>
  );
}

export function Matrix({ go }: { go: Go }) {
  return (
    <TypeOut>
      <p className="text-mint">Siga o coelho branco. 🐇</p>
      <p className="text-phosphor-dim">
        …ou só volte para o <Cmd go={go}>sobre</Cmd>.
      </p>
    </TypeOut>
  );
}
