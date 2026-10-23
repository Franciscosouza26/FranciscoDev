"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { profile } from "@/lib/portfolio";

/*
 * Intro: o retrato em caracteres é gerado na tela, fica um instante e é desfeito.
 * - Normal: efeito Rain do Francisco-Animado.ps1 — colunas caem e depois sobem de volta.
 * - Reduzir Movimento: saída de terminal — o retrato é impresso linha a linha com um
 *   cursor e depois apagado de trás para frente, como um backspace. Nada se desloca
 *   na tela; só aparece e some, então respeita a preferência e mantém a narrativa.
 */

// sem "-", "=" e "+": em ~8px eles viram traços que, somados às scanlines, listram o rosto
const RAMP = " .:;itxX%#@";
const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
const COMMAND = "./retrato.sh --efeito chuva";
const CALM_COMMAND = "cat retrato.txt";

// tempos (ms)
const TYPE_MS = 38;
const RAIN_MS = 2600;
const REVERSE_MS = 1700;
const PRINT_MS = 1900; // impressão linha a linha (~30ms por linha)
const ERASE_MS = 1300; // apagar é mais rápido que escrever, como segurar o backspace
const HOLD_MS = 1200; // curto, mas o bastante para reconhecer o rosto
const FADE_MS = 450;

/*
 * Paleta do retrato: interpola dos tokens --color-phosphor-faint → --color-phosphor → --color-mint
 * (mesmos valores OKLCH do globals.css). Um nível por caractere da rampa: o glifo
 * mais denso também é o mais claro, então forma e luz contam a mesma história.
 */
const PORTRAIT = Array.from({ length: RAMP.length }, (_, i) => {
  const k = i / (RAMP.length - 1);
  const [l, c] = k < 0.7 ? [0.38 + (0.87 - 0.38) * (k / 0.7), 0.08 + 0.13 * (k / 0.7)] : [0.87 + 0.1 * ((k - 0.7) / 0.3), 0.21 - 0.14 * ((k - 0.7) / 0.3)];
  return `oklch(${l.toFixed(3)} ${c.toFixed(3)} 147)`;
});
// rastro da chuva: da cabeça (mint) até sumir no fundo
const TRAIL = Array.from({ length: 8 }, (_, i) => `oklch(${(0.85 - i * 0.07).toFixed(2)} ${(0.21 - i * 0.015).toFixed(3)} 145)`);
const HEAD = "oklch(0.97 0.07 150)";

type Phase = "typing" | "rain" | "hold" | "reverse" | "fade";

function hash(a: number, b: number) {
  let h = Math.imul(a, 0x9e3779b1) ^ Math.imul(b, 0x85ebca77);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

/** Converte a foto em uma grade de índices da rampa (-1 = célula vazia). */
function sample(img: HTMLImageElement, cols: number, rows: number) {
  const c = document.createElement("canvas");
  c.width = cols;
  c.height = rows;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);

  const lum = new Float32Array(cols * rows);
  const opaque: number[] = [];
  for (let i = 0; i < lum.length; i++) {
    const a = data[i * 4 + 3] / 255;
    lum[i] = a < 0.5 ? -1 : (0.2126 * data[i * 4] + 0.7152 * data[i * 4 + 1] + 0.0722 * data[i * 4 + 2]) / 255;
    if (lum[i] >= 0) opaque.push(lum[i]);
  }
  // estica o contraste entre os percentis 3 e 97 — a pele clara ocuparia só o topo da rampa
  opaque.sort((x, y) => x - y);
  const lo = opaque[Math.floor(opaque.length * 0.03)] ?? 0;
  const hi = opaque[Math.floor(opaque.length * 0.97)] ?? 1;

  const cells = new Int8Array(lum.length);
  for (let i = 0; i < lum.length; i++) {
    if (lum[i] < 0) {
      cells[i] = -1;
      continue;
    }
    const v = Math.min(1, Math.max(0, (lum[i] - lo) / (hi - lo || 1)));
    cells[i] = Math.max(1, Math.round(Math.pow(v, 0.9) * (RAMP.length - 1)));
  }
  return cells;
}

/** `reduce`: com Reduzir Movimento, troca a chuva pela impressão/apagamento linha a linha. */
export function PortraitIntro({ onDone, reduce = false }: { onDone: () => void; reduce?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<Phase>("typing");
  const [typed, setTyped] = useState(0);
  const [skip, setSkip] = useState(false);
  const phaseRef = useRef<Phase>("typing");
  const doneRef = useRef(false);
  const reduceRef = useRef(reduce);

  const go = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const finish = useEffectEvent(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    go("fade");
    window.setTimeout(onDone, FADE_MS);
  });

  const command = reduce ? CALM_COMMAND : COMMAND;

  // digita o comando, como se o script fosse chamado no prompt
  useEffect(() => {
    reduceRef.current = reduce;
    const ids = Array.from({ length: command.length }, (_, i) => window.setTimeout(() => setTyped(i + 1), 300 + i * TYPE_MS));
    ids.push(window.setTimeout(() => go("rain"), 300 + command.length * TYPE_MS + 250));
    return () => ids.forEach(clearTimeout);
  }, [reduce, command]);

  // botão "pular" (inclui ativação por leitor de tela, que não gera pointerdown)
  useEffect(() => {
    if (skip) finish();
  }, [skip]);

  // qualquer tecla ou clique pula a intro
  useEffect(() => {
    const skip = () => finish();
    window.addEventListener("keydown", skip);
    window.addEventListener("pointerdown", skip);
    return () => {
      window.removeEventListener("keydown", skip);
      window.removeEventListener("pointerdown", skip);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const img = new Image();
    img.src = "/retrato.png";

    let raf = 0;
    let cells: Int8Array | null = null;
    let cols = 0;
    let rows = 0;
    let cell = 0; // altura da célula em px CSS; largura = cell / 2
    let colOff: Float32Array = new Float32Array(0);
    let order: Int32Array = new Int32Array(0); // ordem de escrita da versão calma
    let trail = 0;
    let speed = 0;
    let start = 0;
    let lastPhase: Phase = "typing";
    let lastT = 0; // o fade mantém o último quadro (vazio depois do apagar) em vez de redesenhar o retrato

    const layout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      rows = vw < 640 ? 46 : 60;
      // cada célula tem proporção 1:2 (largura:altura), como um caractere de terminal
      cols = Math.round((rows * (img.naturalWidth / img.naturalHeight)) / 0.5);
      cell = Math.min((vh * 0.72) / rows, ((vw - 32) / cols) * 2);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.style.width = `${cols * cell * 0.5}px`;
      canvas.style.height = `${rows * cell}px`;
      canvas.width = Math.round(cols * cell * 0.5 * dpr);
      canvas.height = Math.round(rows * cell * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cells = sample(img, cols, rows);
      // mesma matemática do Rain do script: colunas com atraso aleatório e rastro de ~1/3 da altura
      colOff = Float32Array.from({ length: cols }, () => Math.random() * 0.45);
      trail = Math.max(4, rows / 3);
      speed = (rows + trail + 1) / 0.55;

      // versão calma: linha a linha, da esquerda para a direita, só no trecho que tem retrato
      // (o cursor não perde tempo atravessando o fundo vazio)
      const seq: number[] = [];
      for (let r = 0; r < rows; r++) {
        let a = -1;
        let b = -1;
        for (let c = 0; c < cols; c++) {
          if (cells[r * cols + c] >= 0) {
            if (a < 0) a = c;
            b = c;
          }
        }
        for (let c = a; a >= 0 && c <= b; c++) seq.push(r * cols + c);
      }
      order = Int32Array.from(seq);
    };

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!cells) return;
      const p = phaseRef.current;
      if (p !== lastPhase) {
        lastPhase = p;
        start = now;
      }

      // t vai de 0 (vazio) a 1 (retrato completo); no reverso, volta de 1 a 0
      const calm = reduceRef.current;
      let t: number;
      if (p === "typing") t = 0;
      else if (p === "rain") t = Math.min(1, (now - start) / (calm ? PRINT_MS : RAIN_MS));
      else if (p === "hold") t = 1;
      else if (p === "fade") t = lastT;
      else {
        const k = Math.min(1, (now - start) / (calm ? ERASE_MS : REVERSE_MS));
        t = calm ? 1 - k : 1 - k * k; // a chuva começa devagar e acelera ao "subir"
      }

      lastT = t;
      if (p === "rain" && t >= 1) go("hold");
      if (p === "hold" && now - start > HOLD_MS) go("reverse");
      if (p === "reverse" && t <= 0) finish();

      const w = cols * cell * 0.5;
      ctx.clearRect(0, 0, w, rows * cell);
      ctx.font = `${cell * 0.92}px "Cascadia Mono", Consolas, "SF Mono", Menlo, monospace`;
      ctx.textBaseline = "top";

      if (calm) {
        // escreve (ou apaga) até a posição n; o cursor em bloco marca onde está a "cabeça"
        const n = Math.floor(t * order.length);
        const byLevel: number[][] = Array.from({ length: PORTRAIT.length }, () => []);
        for (let k = 0; k < n; k++) {
          const i = order[k];
          if (cells[i] > 0) byLevel[cells[i]].push(i);
        }
        byLevel.forEach((list, v) => {
          if (!list.length) return;
          ctx.fillStyle = PORTRAIT[v];
          for (const i of list) ctx.fillText(RAMP[v], (i % cols) * cell * 0.5, Math.floor(i / cols) * cell);
        });
        if (n < order.length && (p === "rain" || p === "reverse")) {
          const i = order[n];
          ctx.fillStyle = HEAD;
          ctx.fillRect((i % cols) * cell * 0.5, Math.floor(i / cols) * cell + cell * 0.08, cell * 0.5, cell * 0.84);
        }
        return;
      }
      const tick = Math.floor(now / 70);

      // agrupa por cor para trocar o fillStyle poucas vezes por quadro
      const buckets: { ch: string; x: number; y: number }[][] = Array.from({ length: PORTRAIT.length + TRAIL.length + 1 }, () => []);
      for (let c = 0; c < cols; c++) {
        const front = (t - colOff[c]) * speed;
        for (let r = 0; r < rows; r++) {
          const i = r * cols + c;
          const v = cells[i];
          const d = front - r;
          if (d < 0) continue;
          const x = c * cell * 0.5;
          const y = r * cell;
          if (d >= trail) {
            if (v > 0) buckets[v].push({ ch: RAMP[v], x, y });
            continue;
          }
          // a chuva só cai onde existe retrato — a silhueta já se desenha durante a queda
          if (v < 0 && d >= 1) continue;
          const g = GLYPHS[hash(i, d < 1 ? tick : tick >> 2) % GLYPHS.length];
          if (d < 1) buckets[buckets.length - 1].push({ ch: g, x, y });
          else buckets[PORTRAIT.length + Math.min(TRAIL.length - 1, Math.floor((d / trail) * TRAIL.length))].push({ ch: g, x, y });
        }
      }
      buckets.forEach((list, b) => {
        if (!list.length) return;
        ctx.fillStyle = b < PORTRAIT.length ? PORTRAIT[b] : b === buckets.length - 1 ? HEAD : TRAIL[b - PORTRAIT.length];
        for (const g of list) ctx.fillText(g.ch, g.x, g.y);
      });
    };

    const begin = () => {
      layout();
      raf = requestAnimationFrame(draw);
    };
    if (img.complete && img.naturalWidth) begin();
    else img.onload = begin;
    img.onerror = () => finish();

    const onResize = () => {
      if (cells) layout();
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const status =
    phase === "typing"
      ? null
      : phase === "rain"
        ? reduce ? "imprimindo retrato..." : "renderizando retrato..."
        : phase === "hold"
          ? "retrato ok. iniciando terminal..."
          : reduce ? "limpando a tela..." : "iniciando terminal...";

  return (
    <div
      className="crt-screen fixed inset-0 z-60 flex flex-col items-center justify-center gap-4 px-4 transition-opacity ease-in"
      style={{ opacity: phase === "fade" ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="crt-sweep" aria-hidden="true" />

      <p className="crt-glow relative z-5 w-full max-w-3xl text-sm text-phosphor-dim sm:text-base">
        <span className="text-mint">{profile.handle}</span>@matrix:~$ {command.slice(0, typed)}
        {phase === "typing" && (
          <span className="animate-caret ml-0.5 inline-block h-[1.1em] w-[0.6em] translate-y-[0.15em] bg-phosphor" aria-hidden="true" />
        )}
      </p>

      {/* altura reservada (= 72% da tela, a mesma do layout()) para o prompt não "pular" quando o canvas ganha tamanho */}
      <div className="relative z-1 flex h-[72svh] items-center justify-center">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Retrato de ${profile.name} desenhado em caracteres verdes`}
          className="drop-shadow-[0_0_6px_oklch(0.87_0.21_145/0.45)]"
        />
      </div>

      <p className="crt-glow relative z-5 h-5 w-full max-w-3xl text-xs text-phosphor-dim" aria-live="polite">
        {status}
      </p>

      <button
        type="button"
        onClick={() => setSkip(true)}
        className="absolute bottom-4 right-4 z-5 cursor-pointer rounded-sm px-3 py-2 text-xs text-phosphor-dim transition-colors hover:text-phosphor"
      >
        pular intro <span aria-hidden="true">↵</span>
      </button>
    </div>
  );
}
