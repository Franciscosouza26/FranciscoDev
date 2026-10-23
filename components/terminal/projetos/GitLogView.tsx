import { profile, type ProjectCommit } from "@/lib/portfolio";
import type { ProjectView } from "@/lib/projects/types";
import { SELECTED, UNSELECTED } from "./styles";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIFF_WIDTH = 16;

/** "2026-10-05" → "05 out". Partimos a string em vez de usar `new Date()` para o fuso não mudar o dia. */
function shortDate(iso: string) {
  const [, month, day] = iso.split("-");
  return `${day} ${MONTHS[Number(month) - 1]}`;
}

/** Histórico do projeto: cada commit é um passo da demo. Mais novo em cima, como no `git log`. */
export function GitLogView({ project, step, onStep }: { project: ProjectView; step: number; onStep: (step: number) => void }) {
  const commits = project.steps
    .flatMap((s, i) => (s.commit ? [{ commit: s.commit, i }] : []))
    .reverse();
  const current = project.steps[step]?.commit;

  return (
    <div className="space-y-2.5">
      <p className="flex flex-wrap justify-between gap-x-3 text-phosphor-dim">
        <span>$ git log --graph --oneline {project.slug}</span>
        <span className="text-xs opacity-80">{project.commitsSource === "github" ? "github" : "cópia local"}</span>
      </p>

      <ul>
        {commits.map(({ commit, i }) => (
          <li key={commit.hash}>
            <button
              type="button"
              onClick={() => onStep(i)}
              aria-pressed={i === step}
              className={`grid min-h-11 w-full cursor-pointer grid-cols-[16px_62px_1fr_auto] items-center gap-x-2.5 px-2.5 text-left transition-colors focus-visible:-outline-offset-2 sm:min-h-8 ${
                i === step ? SELECTED : UNSELECTED
              }`}
            >
              <span aria-hidden="true">*</span>
              <span className="tabular-nums opacity-75">{commit.hash}</span>
              <span className="truncate">
                {commit.tag && <span className="mr-2 border border-current px-1.5 text-xs">{commit.tag}</span>}
                {commit.message}
              </span>
              <span className="tabular-nums opacity-75">{shortDate(commit.date)}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="border-t border-dashed border-phosphor-faint pt-2.5">
        {current ? <CommitDetail commit={current} /> : <p className="text-phosphor-dim">este passo não tem commit.</p>}
      </div>
    </div>
  );
}

function CommitDetail({ commit }: { commit: ProjectCommit }) {
  const total = commit.additions + commit.deletions;
  const plus = Math.round((commit.additions / Math.max(total, 1)) * DIFF_WIDTH);

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-mint">
        commit {commit.hash}
        {commit.tag && ` (tag: ${commit.tag})`}
      </span>
      <span className="text-phosphor-dim">Author: {profile.name.split(" ")[0]}</span>
      <span className="text-phosphor-dim">
        Date:{"   "}
        <span className="whitespace-pre">
          {shortDate(commit.date)} {commit.date.slice(0, 4)}
        </span>
      </span>
      <span className="my-1.5 pl-4">{commit.message}</span>
      <span className="whitespace-pre tabular-nums">
        {" "}
        {commit.files} arquivos | +{commit.additions} <span className="text-danger">−{commit.deletions}</span>
        {"  "}
        <span aria-hidden="true">
          {"+".repeat(plus)}
          <span className="text-danger">{"−".repeat(DIFF_WIDTH - plus)}</span>
        </span>
      </span>
    </div>
  );
}
