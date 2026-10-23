import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { LiveDemo } from "@/lib/projects/types";
import { checkEmbeddable } from "./embed";

const TIMEOUT_MS = 5000;

/**
 * Health check da demo ao vivo: o site responde? Aceita ser exibido em iframe?
 * Roda no servidor e fica em cache por minutos — o visitante não paga essa espera,
 * e um site que caiu volta a aparecer como offline em pouco tempo.
 */
export async function checkLive(url: string): Promise<LiveDemo> {
  "use cache";
  cacheTag(`live:${url}`);
  cacheLife("minutes");

  if (!url.startsWith("https://")) {
    return { url, online: false, embeddable: false, reason: "a demo ao vivo precisa ser https" };
  }

  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "portfolio-terminal (health check)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    await res.body?.cancel(); // só os headers interessam
    if (!res.ok) return { url, online: false, embeddable: false, reason: `o site respondeu ${res.status}` };

    // SITE_URL = endereço deste portfólio; necessário quando o site libera iframe só para domínios listados
    const embed = checkEmbeddable(res.headers, process.env.SITE_URL);
    return embed.embeddable
      ? { url, online: true, embeddable: true }
      : { url, online: true, embeddable: false, reason: embed.reason };
  } catch (error) {
    const timeout = error instanceof Error && error.name === "TimeoutError";
    return { url, online: false, embeddable: false, reason: timeout ? "o site não respondeu a tempo" : "o site está fora do ar" };
  }
}
