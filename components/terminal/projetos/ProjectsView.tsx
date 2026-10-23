"use client";

import { useState } from "react";
import type { ProjectView } from "@/lib/projects/types";
import { Heading, Next, TypeOut, type Go } from "../views";
import { ProcessTable } from "./ProcessTable";
import { ProjectPreview } from "./ProjectPreview";
import { ProjectTabs, type Tab } from "./ProjectTabs";

export function ProjectsView({ go, projects }: { go: Go; projects: ProjectView[] }) {
  const [selected, setSelected] = useState(0);
  const [tab, setTab] = useState<Tab>("man");
  const [step, setStep] = useState(0); // passo = opção do man = commit = estado da demo

  const current = projects[selected];
  const running = projects.filter((p) => p.status === "rodando").length;

  // reset do passo junto com a seleção: um único render, sem useEffect "corrigindo" depois
  const select = (index: number) => {
    setSelected(index);
    setStep(0);
  };

  return (
    /*
      A tela inteira é digitada na entrada, como as outras. Não redigita ao trocar aba/projeto:
      o TypeOut só age na montagem, e o conteúdo novo de uma troca já entra completo.
    */
    <TypeOut>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <Heading>~/projetos ({projects.length})</Heading>
        <p className="text-xs text-phosphor-dim">
          {running} rodando · {projects.length - running} concluído · clique num processo
        </p>
      </div>

      <ProcessTable projects={projects} selected={selected} onSelect={select} />

      {/*
        No DOM a demo vem antes das abas: é a ordem do mobile (tabela → demo → abas), onde a leitura
        linear importa mais. No desktop o grid devolve as abas para a esquerda (540px | 1fr).
      */}
      <div className="grid gap-4 lg:grid-cols-[540px_minmax(0,1fr)]">
        {/* o preview tem o próprio boot (checando… → online): não é digitado, só aparece quando a digitação chega nele */}
        <div data-typeout-skip className="flex min-h-0 flex-col lg:col-start-2 lg:row-start-1">
          <ProjectPreview key={current.slug} project={current} step={step} onStep={setStep} />
        </div>
        <div className="lg:col-start-1 lg:row-start-1">
          <ProjectTabs project={current} tab={tab} onTab={setTab} step={step} onStep={setStep} />
        </div>
      </div>

      <Next go={go} commands={["stack", "contato"]} />
    </TypeOut>
  );
}
