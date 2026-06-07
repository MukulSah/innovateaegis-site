import { IntegrationsPanel } from "@/components/sai/integrations-panel";
import { SectionPage } from "@/components/sai/section-page";
import {
  getGitHubActivity,
  getGitHubConfig,
  getGitHubSummary,
} from "@/lib/sai/integrations/github";
import { getNotionConfig, getNotionPages } from "@/lib/sai/integrations/notion";

export default async function IntegrationsPage() {
  const [ghConfig, ghSummary, ghActivity, notionConfig, notionPages] = await Promise.all([
    getGitHubConfig(),
    getGitHubSummary(),
    getGitHubActivity(20),
    getNotionConfig(),
    getNotionPages(),
  ]);

  return (
    <SectionPage
      title="Integrations"
      subtitle="GitHub & Notion"
      description="Connect GitHub for engineering visibility and Notion for document sync."
    >
      <IntegrationsPanel
        github={{
          config: ghConfig,
          summary: ghSummary,
          activity: ghActivity.map((a) => ({
            id: a.id,
            repo: a.repo,
            type: a.type,
            title: a.title,
            author: a.author,
            url: a.url,
          })),
        }}
        notion={{
          config: notionConfig,
          pages: notionPages.map((p) => ({
            id: p.id,
            title: p.title,
            pageType: p.pageType,
            syncedAt: p.syncedAt.toISOString(),
          })),
        }}
      />
    </SectionPage>
  );
}
