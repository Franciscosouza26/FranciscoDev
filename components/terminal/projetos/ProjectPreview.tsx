"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProjectStep } from "@/lib/portfolio";
import type { LiveDemo, ProjectView } from "@/lib/projects/types";
import { usePrefersReducedMotion } from "@/lib/hooks";

const BOOT_TICKS = 3;
const BOOT_MS = 260;

type Mode = "live" | "prints";

/*
 * A "janela" da demo. Dois modos:
 * - ao vivo: o projeto que está no ar, num iframe isolado (sandbox), quando o servidor
 *   confirmou que o site responde e aceita ser embutido;
 * - prints: imagem estática por passo — sempre disponível, é o fallback.
 * O pai renderiza com `key={project.slug}`: trocar de projeto monta um preview novo,
 * então boot e modo recomeçam sem resetar estado à mão.
 */
export function ProjectPreview({
  project,
  step,
  onStep,
}: {
  project: ProjectView;
  step: number;
  onStep: (step: number) => void;
}) {
  const reduce = usePrefersReducedMotion();
  const [boot, setBoot] = useState(0);
  const live = project.live;
  const canLive = Boolean(live?.online && live.embeddable);
  const [mode, setMode] = useState<Mode>(canLive ? "live" : "prints");

  // mini boot: ○ checando… → ● online. O cleanup cancela os timers se o visitante trocar de
  // projeto no meio — sem ele, os timers do projeto antigo continuariam disparando.
  useEffect(() => {
    if (reduce) return;
    const ids = Array.from({ length: BOOT_TICKS }, (_, i) => setTimeout(() => setBoot(i + 1), BOOT_MS * (i + 1)));
    return () => ids.forEach(clearTimeout);
  }, [reduce]);

  const ready = reduce || boot >= BOOT_TICKS;
  const checked = reduce || boot >= BOOT_TICKS - 1;
  const total = project.steps.length;
  const current = project.steps[step];
  const go = (delta: number) => onStep((step + delta + total) % total);
  const showLive = mode === "live" && canLive && live;

  return (
    <section
      aria-label={`Demonstração de ${project.name}`}
      // acima das scanlines (z-3) e da vinheta (z-4), com fundo sólido: a demo "acende" como um app de verdade
      className="relative z-5 flex min-h-0 flex-1 flex-col border border-phosphor-dim bg-void"
    >
      <div className="flex items-center justify-between gap-2 border-b border-phosphor-faint px-3 py-1 text-xs text-phosphor-dim">
        <span className="truncate">
          preview://{project.slug}
          {current.commit && ` @${current.commit.hash}`}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Health checked={checked} live={live} />
          {live?.online && (
            <a href={live.url} target="_blank" rel="noreferrer" className="text-mint underline-offset-4 hover:underline">
              [abrir ↗]
            </a>
          )}
        </span>
      </div>

      {canLive && (
        <div className="flex border-b border-phosphor-faint text-xs">
          {(["live", "prints"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`min-h-9 flex-1 cursor-pointer transition-colors focus-visible:-outline-offset-2 sm:min-h-7 ${
                mode === m ? "bg-phosphor/12 text-mint shadow-[inset_0_-2px_0_var(--color-phosphor)]" : "text-phosphor-dim hover:text-phosphor"
              }`}
            >
              {m === "live" ? "ao vivo" : "prints"}
            </button>
          ))}
        </div>
      )}

      <div className="relative h-70 lg:h-auto lg:min-h-70 lg:flex-1">
        {!ready ? (
          <p className="flex h-full items-center justify-center text-sm text-phosphor-dim">montando sandbox…</p>
        ) : showLive ? (
          <LiveFrame key={liveSrc(live, current)} src={liveSrc(live, current)} title={`${project.name} ao vivo: ${current.help}`} />
        ) : (
          <StepImage key={current.image} name={project.name} step={current} />
        )}
      </div>

      {live && !canLive && ready && (
        <p className="border-t border-phosphor-faint px-3 py-1 text-xs text-phosphor-dim">
          demo ao vivo indisponível: {live.reason} · mostrando prints
        </p>
      )}

      <div className="flex items-center gap-2 border-t border-phosphor-faint px-2 py-1.5">
        <StepButton label="passo anterior" onClick={() => go(-1)} disabled={total < 2}>
          [‹]
        </StepButton>
        <p className="min-w-0 flex-1 truncate text-center text-xs" aria-live="polite">
          <span className="text-phosphor-dim">
            {step + 1}/{total} ·
          </span>{" "}
          $ {project.slug} {current.flag}
        </p>
        <StepButton label="próximo passo" onClick={() => go(1)} disabled={total < 2}>
          [›]
        </StepButton>
      </div>
    </section>
  );
}

/** Passo com `livePath` abre aquela rota do projeto; sem `livePath`, a página inicial. */
function liveSrc(live: LiveDemo, step: ProjectStep) {
  return new URL(step.livePath ?? "", live.url).toString();
}

function Health({ checked, live }: { checked: boolean; live: LiveDemo | null }) {
  if (!checked) return <span>○ checando…</span>;
  if (live && !live.online) return <span>○ offline</span>;
  return (
    <span>
      <span aria-hidden="true">●</span> online
    </span>
  );
}

/*
 * sandbox: o site roda scripts e formulários, mas SEM `allow-top-navigation` — ele não
 * consegue redirecionar o portfólio. `allow-same-origin` aqui é seguro porque a demo está em
 * outro domínio: a origem dela continua sendo a dela, não a deste site.
 */
const DESKTOP_VIEWPORT = 1280;
const MOBILE_VIEWPORT = 390;
const MOBILE_BELOW = 500; // painel mais estreito que isso: 1280px reduzido ficaria ilegível, então usa o layout mobile do site

/*
 * "Tela inteira, só que reduzida": o iframe é renderizado com a largura de uma tela real
 * (1280px) e encolhido com transform: scale() até caber no painel. O site se diagramaria
 * como no computador, em vez de virar o layout espremido de 380px.
 * A altura é compensada (altura do painel ÷ escala) para o quadro preencher o painel todo.
 * Igual ao AsciiArt: mede com ResizeObserver e ajusta direto no DOM, sem re-render.
 */
function LiveFrame({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const frame = frameRef.current;
    if (!box || !frame) return;
    const fit = () => {
      const viewport = box.clientWidth < MOBILE_BELOW ? MOBILE_VIEWPORT : DESKTOP_VIEWPORT;
      const scale = Math.min(1, box.clientWidth / viewport);
      frame.style.width = `${viewport}px`;
      frame.style.height = `${box.clientHeight / scale}px`;
      frame.style.transform = `scale(${scale})`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className="absolute inset-0 overflow-hidden">
      {!loaded && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-phosphor-dim">carregando demo ao vivo…</p>
      )}
      <iframe
        ref={frameRef}
        src={src}
        title={title}
        loading="lazy"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setLoaded(true)}
        className={`absolute left-0 top-0 origin-top-left bg-white transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="min-h-11 min-w-11 cursor-pointer text-mint transition-colors hover:bg-phosphor-faint/60 disabled:cursor-default disabled:opacity-40 sm:min-h-9 sm:min-w-9"
    >
      {children}
    </button>
  );
}

/** Print do passo. Se o arquivo ainda não existe (placeholders), mostra o aviso em vez de um ícone quebrado. */
function StepImage({ name, step }: { name: string; step: ProjectStep }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-4 text-center text-sm text-phosphor-dim">
        <p>sem print para este passo ainda</p>
        <p className="text-xs opacity-80">{step.image}</p>
      </div>
    );
  }

  return (
    <Image
      src={step.image}
      alt={`${name}: ${step.help}`}
      fill
      sizes="(min-width: 1024px) 400px, 100vw"
      className="object-contain"
      onError={() => setFailed(true)}
    />
  );
}
