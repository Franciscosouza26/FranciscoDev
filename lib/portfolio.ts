// Todo o conteúdo do portfólio mora aqui — edite este arquivo para trocar textos, projetos e links.

export const profile = {
  name: "Francisco Correia de Souza",
  handle: "francisco",
  role: "dev front-end · estudante da 2° Fase de engenharia de software",
  intro: [
    "Construo interfaces web e mobile com React, Next.js, Tailwind e React Native/Expo.",
    "Gosto do ponto onde design e código se encontram: tipografia, microinterações e acessibilidade.",
  ],
  status: "disponível para Vagas e Projetos",
};

// Commit local: é o fallback da aba `git log` quando o GitHub não responde (ou o projeto não tem `repo`).
export type ProjectCommit = {
  hash: string; // 7 caracteres, como no `git log --oneline`
  tag?: string; // "v0.2"
  message: string;
  date: string; // ISO "2026-10-05" — mesmo formato que a API do GitHub devolve
  files: number;
  additions: number;
  deletions: number;
};

// Passo = opção do man = commit = estado da demo (um único `step` controla os três).
export type ProjectStep = {
  flag: string; // `--confirmar --nome "Ana"`
  help: string; // também serve de base para o `alt` da imagem
  image: string; // print daquele estado em /public — é o fallback quando a demo ao vivo não carrega
  livePath?: string; // rota da demo ao vivo para este passo ("/convite/abc"), relativa a `liveUrl`
  commit?: ProjectCommit;
};

// De 1 a 5 passos: cada projeto mostra quantos estados fizerem sentido para a demo.
// O teto existe para o man e o git log caberem no painel sem virar um tutorial — a demo é
// uma amostra; quem quiser mais vai para o repositório.
export type ProjectSteps =
  | [ProjectStep]
  | [ProjectStep, ProjectStep]
  | [ProjectStep, ProjectStep, ProjectStep]
  | [ProjectStep, ProjectStep, ProjectStep, ProjectStep]
  | [ProjectStep, ProjectStep, ProjectStep, ProjectStep, ProjectStep];

export type Project = {
  slug: string;
  pid: string; // string para manter os zeros à esquerda ("0001")
  name: string;
  kind: string;
  description: string;
  tags: string[];
  status: "rodando" | "concluído";
  progress: number; // 0–100, qualquer valor; a barra ASCII arredonda para a dezena mais próxima
  synopsis: string;
  steps: ProjectSteps;
  decision?: string; // fallback de "## Decisões" se não houver README
  run?: string; // fallback de "## Rodando localmente"
  repo?: string; // "usuario/repositorio" → README e commits vêm do GitHub
  pages?: string[]; // até 5 arquivos .md do repo para ler no painel, ex.: ["docs/arquitetura.md"]
  liveUrl?: string; // projeto no ar (https). Vira demo ao vivo no preview se o site permitir iframe
  code?: string;
};

// PLACEHOLDER: os quatro projetos abaixo são de exemplo (dados do mockup V6).
// Trocar por projetos reais (FindParty, MercadoSolidario, extensão de presença, Intranet Mohawk)
// e preencher `repo`. As imagens em /projetos/<slug>/ ainda não existem.
export const projects: Project[] = [
  {
    slug: "terminal",
    pid: "0001",
    name: "Este terminal",
    kind: "portfólio",
    description: "Sim, você está dentro de um projeto agora. Next.js, canvas e muito fósforo verde.",
    tags: ["next.js", "canvas", "a11y"],
    status: "rodando",
    progress: 90,
    synopsis: "[--boot] [projetos] [sudo COMANDO]",
    steps: [
      {
        flag: "--boot",
        help: "sequência de boot do CRT",
        image: "/projetos/terminal/01.png",
        commit: { hash: "0b4e7f9", message: "feat: boot CRT + scanlines", date: "2026-09-25", files: 8, additions: 301, deletions: 22 },
      },
      {
        flag: "projetos",
        help: "lista os projetos",
        image: "/projetos/terminal/02.png",
        commit: { hash: "33f8b6e", message: "feat: comando projetos com digitação", date: "2026-10-12", files: 6, additions: 120, deletions: 18 },
      },
      {
        flag: "sudo contratar",
        help: "easter egg para recrutadores",
        image: "/projetos/terminal/03.png",
        commit: { hash: "e91c0d4", tag: "v1.0", message: "feat: easter egg sudo contratar", date: "2026-10-22", files: 4, additions: 61, deletions: 9 },
      },
    ],
    decision: "Toda saída é digitada, mas qualquer tecla completa: ninguém fica preso esperando.",
    run: "npm install\nnpm run dev",
    code: "#",
  },
   {
    slug: "mercado-solidario",
    pid: "0825",                       // qualquer número de 4 dígitos; aqui usei o mês/ano em que o projeto começou
    name: "Mercado Solidário",
    kind: "site institucional",
    description: "ESCREVA AQUI: o que o projeto é e para quem ele serve, em uma frase.",
    tags: ["html", "css", "javascript"],
    status: "rodando",                 // ou "concluído"
    progress: 90,
    synopsis: "[--inicio] [--metas] [--galeria] [--contato]",
    steps: [
      { flag: "--inicio",  help: "página inicial do projeto", image: "/projetos/mercado-solidario/01.png", livePath: "/" },
      { flag: "--metas",   help: "metas e impacto",           image: "/projetos/mercado-solidario/02.png", livePath: "/metas.html" },
      { flag: "--galeria", help: "fotos das ações",           image: "/projetos/mercado-solidario/03.png", livePath: "/galeria.html" },
      { flag: "--contato", help: "como ajudar ou falar com a equipe", image: "/projetos/mercado-solidario/04.png", livePath: "/contato.html" },
    ],
    decision: "ESCREVA AQUI: uma decisão técnica ou de design de que você se orgulha.",
    repo: "Franciscosouza26/SISTEMA-MS",
    liveUrl: "https://mercadosolidariooficial.org",
    code: "https://github.com/Franciscosouza26/SISTEMA-MS",
  },
];

export type Skill = { name: string; level: 1 | 2 | 3 | 4 | 5 };

export const LEVEL_LABEL: Record<Skill["level"], string> = {
  1: "explorando",
  2: "estudando",
  3: "intermediário",
  4: "avançado",
  5: "domínio",
};

export const stack: { group: string; skills: Skill[] }[] = [
  {
    group: "front-end",
    skills: [
      { name: "React", level: 4 },
      { name: "Next.js", level: 3 },
      { name: "TypeScript", level: 3 },
      { name: "Tailwind CSS", level: 4 },
    ],
  },
  {
    group: "mobile",
    skills: [
      { name: "React Native", level: 3 },
      { name: "Expo", level: 3 },
    ],
  },
  {
    group: "design & ferramentas",
    skills: [
      { name: "Figma", level: 3 },
      { name: "Git", level: 3 },
      { name: "Acessibilidade", level: 3 },
    ],
  },
];

export const contacts = {
  email: "franciscosouza2611@gmail.com",
  location: "Brasil (UTC−3)",
  responseTime: "48h",
  githubUser: "Franciscosouza26", // os números do card do GitHub vêm da API (com cache), não daqui
  links: [
    { label: "linkedin", href: "https://www.linkedin.com/in/francisco-correia-de-souza", display: "/in/francisco-correia-de-souza" },
    { label: "github", href: "https://github.com/Franciscosouza26", display: "/Franciscosouza26" },
  ],
};

// Assuntos prontos do formulário: poupam o "como eu começo?" e já dizem que tipo de contato é.
export const CONTACT_SUBJECTS = {
  vaga: "vaga",
  freela: "freela",
  projeto: "projeto",
  oi: "só um oi",
} as const;
