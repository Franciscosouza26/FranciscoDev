import { Portfolio } from "@/components/terminal/Portfolio";
import { fetchGitHubProfile } from "@/lib/github/profile";
import { contacts } from "@/lib/portfolio";
import { getProjectsContent } from "@/lib/projects/content";

// Server Component: busca no GitHub acontece aqui (com cache), e o terminal recebe só os dados prontos.
export default async function Home() {
  const [projects, github] = await Promise.all([getProjectsContent(), fetchGitHubProfile(contacts.githubUser)]);
  if (!github.ok) console.warn(`[contato] card do GitHub sem números — ${github.reason}`);
  return (
    <main>
      <Portfolio projects={projects} github={github.ok ? github.value : null} />
    </main>
  );
}
