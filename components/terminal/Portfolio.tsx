"use client";

import { useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks";
import type { GitHubProfile } from "@/lib/github/profile";
import type { ProjectView } from "@/lib/projects/types";
import { PortraitIntro } from "./PortraitIntro";
import { Terminal } from "./Terminal";

/**
 * Intro do retrato por cima do terminal. Com Reduzir Movimento ela continua aparecendo,
 * só que na versão calma (sem chuva) — menos movimento não significa esconder conteúdo.
 */
export function Portfolio({ projects, github }: { projects: ProjectView[]; github: GitHubProfile | null }) {
  const reduce = usePrefersReducedMotion();
  const [introDone, setIntroDone] = useState(false);

  return (
    <>
      <Terminal ready={introDone} projects={projects} github={github} />
      {!introDone && <PortraitIntro reduce={reduce} onDone={() => setIntroDone(true)} />}
    </>
  );
}
