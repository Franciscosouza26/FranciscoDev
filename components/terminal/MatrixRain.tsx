"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";

const GLYPHS = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
const SIZE = 16;
const FRAME_MS = 50; // ~20fps: o "engasgo" faz parte da estética e poupa CPU

const pick = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/** Chuva de caracteres ao fundo. Decorativa: não renderiza com Reduzir Movimento. */
export function MatrixRain({ intense }: { intense: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || reduce) return;

    const css = getComputedStyle(document.documentElement);
    const green = css.getPropertyValue("--color-phosphor").trim();
    const head = css.getPropertyValue("--color-mint").trim();
    const bg = css.getPropertyValue("--color-void").trim();
    const fade = "rgb(4 12 7 / 0.14)";
    const font = `${SIZE}px ${getComputedStyle(document.body).fontFamily}`;

    let w = 0;
    let h = 0;
    let drops: number[] = [];
    let trail: string[] = [];
    let raf = 0;
    let last = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cols = Math.ceil(w / SIZE);
      drops = Array.from({ length: cols }, () => Math.floor((Math.random() * -h) / SIZE));
      trail = Array.from({ length: cols }, pick);
    };

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < FRAME_MS) return;
      last = t;

      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, w, h);
      ctx.font = font;
      ctx.textBaseline = "top";

      for (let i = 0; i < drops.length; i++) {
        const x = i * SIZE;
        const y = drops[i] * SIZE;
        // o caractere anterior "esfria" para verde; a cabeça da gota fica quase branca
        ctx.fillStyle = bg;
        ctx.fillRect(x, y - SIZE, SIZE, SIZE);
        ctx.fillStyle = green;
        ctx.fillText(trail[i], x, y - SIZE);
        trail[i] = pick();
        ctx.fillStyle = head;
        ctx.fillText(trail[i], x, y);

        if (y > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`matrix-rain pointer-events-none fixed inset-0 h-full w-full ${
        intense ? "z-50 opacity-90" : "z-0 opacity-30"
      }`}
    />
  );
}
