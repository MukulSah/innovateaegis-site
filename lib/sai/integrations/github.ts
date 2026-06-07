import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { logActivity } from "@/lib/sai/activity";

interface GitHubConfig {
  repos?: string[];
  org?: string;
}

function parseConfig(raw: string): GitHubConfig {
  try {
    return JSON.parse(raw) as GitHubConfig;
  } catch {
    return {};
  }
}

async function githubFetch(path: string, token: string) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function getGitHubActivity(limit = 30) {
  const companyId = await getCompanyId();
  return prisma.gitHubActivity.findMany({
    where: { companyId },
    orderBy: { syncedAt: "desc" },
    take: limit,
  });
}

export async function getGitHubSummary() {
  const companyId = await getCompanyId();
  const activities = await prisma.gitHubActivity.findMany({ where: { companyId } });

  const byType: Record<string, number> = {};
  const byRepo: Record<string, number> = {};
  activities.forEach((a) => {
    byType[a.type] = (byType[a.type] ?? 0) + 1;
    byRepo[a.repo] = (byRepo[a.repo] ?? 0) + 1;
  });

  return { byType, byRepo, total: activities.length };
}

export async function getGitHubConfig() {
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "github" } });
  const token = process.env.GITHUB_TOKEN;
  return {
    enabled: config?.enabled ?? false,
    hasToken: Boolean(token),
    config: config ? parseConfig(config.config) : {},
  };
}

async function upsertActivity(
  companyId: string,
  data: {
    externalId: string;
    repo: string;
    type: string;
    title: string;
    author?: string;
    url?: string;
    projectId?: string;
  },
) {
  return prisma.gitHubActivity.upsert({
    where: { companyId_externalId: { companyId, externalId: data.externalId } },
    create: { ...data, companyId },
    update: {
      title: data.title,
      author: data.author,
      url: data.url,
      syncedAt: new Date(),
    },
  });
}

export async function syncGitHubRepos(projectId?: string) {
  const companyId = await getCompanyId();
  const config = await prisma.integrationConfig.findUnique({ where: { provider: "github" } });
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    return { synced: 0, message: "Set GITHUB_TOKEN environment variable to enable GitHub sync." };
  }

  if (!config?.enabled) {
    await prisma.integrationConfig.upsert({
      where: { provider: "github" },
      create: { provider: "github", enabled: true, config: config?.config ?? "{}" },
      update: { enabled: true },
    });
  }

  const ghConfig = parseConfig(config?.config ?? "{}");
  let repos: string[] = ghConfig.repos ?? [];

  if (repos.length === 0 && ghConfig.org) {
    const orgRepos = (await githubFetch(`/orgs/${ghConfig.org}/repos?per_page=20`, token)) as Array<{
      full_name: string;
    }>;
    repos = orgRepos.map((r) => r.full_name);
  }

  if (repos.length === 0) {
    const userRepos = (await githubFetch("/user/repos?per_page=20&sort=updated", token)) as Array<{
      full_name: string;
    }>;
    repos = userRepos.map((r) => r.full_name);
  }

  let synced = 0;

  for (const repo of repos.slice(0, 10)) {
    const [issues, pulls, releases] = await Promise.all([
      githubFetch(`/repos/${repo}/issues?state=all&per_page=15`, token) as Promise<
        Array<{ id: number; title: string; user: { login: string }; html_url: string; pull_request?: unknown }>
      >,
      githubFetch(`/repos/${repo}/pulls?state=all&per_page=15`, token) as Promise<
        Array<{ id: number; title: string; user: { login: string }; html_url: string }>
      >,
      githubFetch(`/repos/${repo}/releases?per_page=10`, token) as Promise<
        Array<{ id: number; name: string; author: { login: string }; html_url: string }>
      >,
    ]);

    for (const issue of issues.filter((i) => !i.pull_request)) {
      await upsertActivity(companyId, {
        externalId: `issue-${repo}-${issue.id}`,
        repo,
        type: "issue",
        title: issue.title,
        author: issue.user.login,
        url: issue.html_url,
        projectId,
      });
      synced++;
    }

    for (const pr of pulls) {
      await upsertActivity(companyId, {
        externalId: `pr-${repo}-${pr.id}`,
        repo,
        type: "pull_request",
        title: pr.title,
        author: pr.user.login,
        url: pr.html_url,
        projectId,
      });
      synced++;
    }

    for (const release of releases) {
      await upsertActivity(companyId, {
        externalId: `release-${repo}-${release.id}`,
        repo,
        type: "release",
        title: release.name,
        author: release.author.login,
        url: release.html_url,
        projectId,
      });
      synced++;
    }

    const commits = (await githubFetch(`/repos/${repo}/commits?per_page=10`, token)) as Array<{
      sha: string;
      commit: { message: string; author: { name: string } };
      html_url: string;
    }>;

    for (const commit of commits) {
      await upsertActivity(companyId, {
        externalId: `commit-${repo}-${commit.sha}`,
        repo,
        type: "commit",
        title: commit.commit.message.split("\n")[0],
        author: commit.commit.author.name,
        url: commit.html_url,
        projectId,
      });
      synced++;
    }
  }

  await logActivity({
    type: "integration_sync",
    title: "GitHub sync completed",
    description: `Synced ${synced} activities from ${repos.length} repositories`,
    companyId,
    projectId,
    metadata: { provider: "github", synced, repos },
  });

  return { synced, message: `GitHub sync complete. ${synced} activities from ${repos.length} repo(s).` };
}
