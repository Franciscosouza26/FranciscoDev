# Handoff — página de projetos V6

> Documento gerado ao fim de uma sessão de design no Claude (23/10/2026).
> Serve como memória da conversa para implementar a V6 neste repositório.
> Canvas com todas as versões (privado, só o Francisco abre): https://claude.ai/artifact/U1hZF5MmVYstXg6YyGxTrN
> Fontes do design (referência de layout, cores e dados; formato `.dc.html`, NÃO é código para copiar): `docs/mockups-v6/`

## 1. Contexto e decisão

O portfólio é um terminal CRT de fósforo verde (Next.js 16 + React 19 + Tailwind 4). A tela `projetos`
(`Projetos` em `components/terminal/views.tsx`) hoje é um grid de cards. O objetivo é que o visitante veja
uma **demonstração** de cada projeto sem sair do terminal.

Foram exploradas 5 versões (v1 `top`, v2 `man`, v3 `git log`, v4 `tmux`, v5 `ranger`). Decisão do Francisco:

- **Layout da v1** (tabela de processos em cima, área dividida embaixo) — o posicionamento mais estético.
- **Exibição do projeto da v2 (`man`) e da v3 (`git log`)** — mostram o projeto de forma clara.
- **Novo: README.md do projeto** visível na página.

Resultado = **V6**: quadros `Final.dc.html` (desktop) e `FinalMobile.dc.html` (390px).

## 2. Anatomia da V6 (desktop, dentro da área de saída do Terminal)

```
francisco@matrix:~$ projetos
~/projetos (4)                          3 rodando · 1 concluído · clique num processo
┌──────────────────────────────────────────────────────────────────────┐
│    PID   NOME               TIPO           STATUS       PROGRESSO      │  ← cabeçalho faint/50%
│ ▶  1042  rolê               app mobile     ● rodando    [||||||||  ] 80%│  ← selecionado = invertido
│    1187  painel de intranet dashboard      ● rodando    [||||||    ] 60%│
│    ...                                                                  │
└──────────────────────────────────────────────────────────────────────┘
┌─ [man role] [git log] [README.md] ─────┐ ┌─ preview://role @1ce96b0  ● online ┐
│ aba ativa (ver §3)                      │ │                                    │
│                                         │ │   demo do passo atual              │
│                                         │ │                                    │
│                                         │ │ [‹]  2/3 · $ role --confirmar  [›] │
└─────────────────────────────────────────┘ └────────────────────────────────────┘
```

- Grid de baixo: `540px | 1fr`, gap 16px. Tabela: colunas `20px 52px 200px 130px 120px 1fr`, gap 12px, linhas ≥ 32px.
- Status sempre com glifo + texto (`● rodando` / `✓ concluído`) — nunca só cor.
- Barra de progresso em ASCII, `white-space: pre`, `tabular-nums`.
- Painel da demo fica **acima** das scanlines (`z-index` maior que `.crt-screen::before`) e com fundo sólido: a demo "acende" como app real dentro do terminal.
- Ao trocar de projeto: mini boot (`○ checando…` → `● online`, ~3 × 260ms) antes de mostrar a demo; com `prefers-reduced-motion` é instantâneo.

### Mobile (< sm)
Tudo empilha: tabela vira lista de 2 linhas por item (nome + status / pid · tipo + barra) → demo (altura fixa ~280px) → abas (largura total, 3 colunas iguais). Alvos de toque ≥ 44px. Ver `FinalMobile.dc.html`.

## 3. As três abas

| Aba | Conteúdo | Interação |
|---|---|---|
| `man <slug>` | `SLUG(1) Manual de Projetos SLUG(1)`, NOME, SINOPSE, DESCRIÇÃO, OPÇÕES | Cada opção (`--confirmar --nome "Ana"`) é um botão que muda o passo da demo |
| `git log` | `$ git log --graph --oneline <slug>`, 3 commits (mais novo em cima) com tag opcional; abaixo o detalhe: hash, autor, data, mensagem, diffstat `+214 −38 ++++----` | Clicar num commit muda o passo da demo |
| `README.md` | `$ cat README.md · renderizado`: título, tags, descrição, `## Funcionalidades`, `## Decisões`, `## Rodando localmente` (bloco de código), links repositório/GitHub | Rolável dentro do painel; NÃO usar o efeito de digitação aqui |

**Ideia central: passo = opção do man = commit = estado da demo.** Um único `step` (0–2) controla tudo; o header da demo mostra `preview://<slug> @<hash do commit do passo>`.

## 4. Estado (componente pai da tela)

```ts
const [selected, setSelected] = useState(0);              // índice do projeto
const [tab, setTab] = useState<"man" | "log" | "readme">("man");
const [step, setStep] = useState(0);                       // reseta para 0 ao trocar de projeto
```

## 5. Modelo de dados proposto (`lib/portfolio.ts`)

```ts
export type ProjectStep = {
  flag: string;      // "--confirmar --nome \"Ana\""
  help: string;      // "confirma presença sem cadastro"
  image: string;     // /projetos/role/02.avif — print daquele estado (v1 da implementação)
  commit?: string;   // hash/tag que corresponde a esse passo
};

export type Project = {
  slug: string; name: string; kind: string; description: string; tags: string[];
  status: "rodando" | "concluído";
  progress: number;          // 0–100, múltiplo de 10 para a barra ASCII
  synopsis: string;          // "[--abrir-convite] [--confirmar --nome NOME] [--lista]"
  steps: ProjectStep[];      // 3 passos
  decision?: string;         // fallback de "## Decisões" se não houver README
  repo?: string;             // "usuario/repositorio" → README e commits vêm do GitHub
  demo?: string; code?: string;
};
```

> **Implementado (passo 1) com ajustes** — ver `lib/portfolio.ts`: `commit` virou objeto `ProjectCommit`
> (hash, tag, mensagem, data ISO, diffstat) para o fallback do git log; novos campos `pid` (string) e `run`;
> `progress` aceita qualquer 0–100 (a barra arredonda); `steps` tem de 1 a 5 passos (`ProjectSteps`), não
> exatamente 3. A demo é uma amostra: o último passo deve levar ao repositório.

Os dados atuais em `portfolio.ts` (Rolê, Painel de intranet, Tokens OKLCH, Este terminal) são placeholders.
Projetos reais que o Francisco pode colocar no lugar: FindParty, MercadoSolidario, extensão de presença, Intranet Mohawk.

## 6. Backend / origem dos dados

- **README e commits vêm do GitHub no servidor**, não no cliente:
  - `GET https://api.github.com/repos/{repo}/readme` (header `Accept: application/vnd.github.raw`)
  - `GET https://api.github.com/repos/{repo}/commits?per_page=…` (ou tags/releases)
- Buscar num Server Component / função de servidor com revalidação (ex.: a cada poucas horas) — **checar a API de cache/revalidate do Next 16 em `node_modules/next/dist/docs/` antes** (ver AGENTS.md).
- Renderizar markdown no servidor e **sanitizar** o HTML. Token do GitHub (se usar) só em variável de ambiente, nunca no repositório.
- **Fallback obrigatório**: API falhou, sem `repo` ou rate limit → aba README mostra `description` + `steps` + `decision`; aba git log mostra os `commit` dos steps. A página nunca quebra.
- Demo: na primeira versão, cada passo é uma imagem estática (print). Iframe/embed ao vivo fica para depois (exigiria sandbox, lazy-load e health check).

### Implementado (passo 5 + demo ao vivo)

Sem backend separado nem banco: `app/page.tsx` (Server Component) chama `getProjectsContent()` e passa
`ProjectView[]` por props até o `ProjectsView`. Tudo em `"use cache"`; a página continua estática.

```
lib/github/client.ts   único ponto que fala com a API (token, timeout 5s, limite de tamanho, server-only)
lib/github/repo.ts     fetchReadmeHtml / fetchPageHtml / fetchCommit — cache: sucesso horas (commit: dias), falha minutos
lib/github/html.ts     sanitize-html (allowlist) + reescrita de links/imagens relativos (HEAD = branch padrão)
lib/live/check.ts      health check da demo ao vivo (online? permite iframe?) — cache minutos
lib/live/embed.ts      regra pura de X-Frame-Options / CSP frame-ancestors
lib/projects/merge.ts  regra pura do fallback por campo (testada)
lib/projects/content.ts orquestra tudo em paralelo; loga no servidor o motivo de cada fallback
```

- README pedido já em HTML (`application/vnd.github.html`); páginas extras = lista curada `pages` (até 5).
- Commits buscados pelo hash dos passos (`/commits/{sha}`) → diffstat real; tag continua vindo do `portfolio.ts`.
- Demo ao vivo: `liveUrl` no projeto, `livePath` por passo. Iframe com `sandbox` sem `allow-top-navigation`.
  Se o site está fora do ar ou proíbe iframe, o preview cai nos prints e diz o motivo.
- Testes: `npm test` (Vitest) cobre `html.ts`, `embed.ts` e `merge.ts`.
- Variáveis de ambiente (servidor): `GITHUB_TOKEN` (fine-grained, só leitura de repos públicos) e
  `SITE_URL` (endereço do portfólio, para sites que liberam iframe só a domínios listados).
- Fase 2 (não feita): webhook do GitHub → `revalidateTag('repo:<repo>', 'max')`.

## 7. Componentes sugeridos

```
components/terminal/projetos/
  ProjectsView.tsx     // estado (selected, tab, step) + layout
  ProcessTable.tsx     // tabela da v1 (botões com aria-pressed)
  ProjectTabs.tsx      // barra de abas + painel
  ManView.tsx
  GitLogView.tsx
  ReadmeView.tsx
  ProjectPreview.tsx   // header preview://, imagem do passo, controles ‹ ›
```
Substituir `Projetos` em `views.tsx` por `ProjectsView`. A tela inteira fica dentro de `TypeOut`, igual às outras. Ele só digita na montagem, então trocar aba ou projeto não redigita nada. O preview leva `data-typeout-skip` porque o boot dele muda o texto sozinho: ele não é digitado e aparece inteiro quando a digitação chega nele.

## 8. Tokens (já existem em `app/globals.css` — NÃO inventar novos)

`void`, `screen`, `phosphor`, `phosphor-dim`, `phosphor-faint`, `mint`, `danger` (usado no `−` do diffstat).
Selecionado = fundo `phosphor`, texto `void`, sem `text-shadow`. Aba ativa = `phosphor/12%` + sublinhado interno de 2px.
Fonte do terminal: JetBrains Mono (já configurada). As demos (imagens) carregam a identidade de cada projeto.

## 9. Acessibilidade — pendências

- **Padrão das abas ainda NÃO decidido pelo Francisco.** Ele quer chegar à resposta de forma guiada: discutir o padrão ARIA de Tabs (`tablist`/`tab`/`tabpanel`, setas entre abas, `aria-selected`, `aria-controls`) versus botões simples, e por quê.
- Tabela de projetos: botões reais com `aria-pressed`; foco visível em `mint`.
- `prefers-reduced-motion`: sem boot animado, sem caret piscando (já há regra global).
- Imagens das demos com `alt` descrevendo o passo.

## 10. Ordem sugerida de implementação

1. Ampliar o tipo `Project` e os dados (com placeholders marcados).
2. `ProcessTable` + estado de seleção, substituindo o grid atual.
3. `ProjectTabs` com `ManView` e `GitLogView` usando dados locais.
4. `ProjectPreview` com imagens por passo.
5. `ReadmeView` com busca no GitHub + fallback.
6. Responsivo (mobile empilhado), reduced motion, revisão de acessibilidade (decidir padrão das abas).
