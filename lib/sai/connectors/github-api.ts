import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { decryptSecret } from "../crypto";

export type GithubAccount = {
  id: string;
  accountLabel: string;
  accountIdentifier: string;
  accessToken: string;
};

export type GithubPullRequest = {
  number: number;
  title: string;
  state: string;
  draft: boolean;
  headSha: string;
  baseRef: string;
  headRef: string;
  htmlUrl: string;
};

async function getGithubAccounts(): Promise<GithubAccount[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("integration_accounts")
    .select("id, account_label, account_identifier, access_token_encrypted, status")
    .eq("provider", "github")
    .eq("status", "active");

  if (error) return [];

  return (data ?? [])
    .map((row) => ({
      id: row.id as string,
      accountLabel: row.account_label as string,
      accountIdentifier: row.account_identifier as string,
      accessToken: decryptSecret((row.access_token_encrypted as string) ?? ""),
    }))
    .filter((a) => a.accessToken);
}

async function githubFetch<T>(
  token: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function listGithubRepos(accountId?: string): Promise<
  { fullName: string; defaultBranch: string; private: boolean }[]
> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return [];

  type RepoRow = { full_name: string; default_branch: string; private: boolean };
  const repos = await githubFetch<RepoRow[]>(
    account.accessToken,
    `/user/repos?per_page=100&sort=updated`,
  );

  return repos.map((r) => ({
    fullName: r.full_name,
    defaultBranch: r.default_branch,
    private: r.private,
  }));
}

export async function getPullRequest(
  repo: string,
  prNumber: number,
  accountId?: string,
): Promise<GithubPullRequest | null> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return null;

  type PrRow = {
    number: number;
    title: string;
    state: string;
    draft: boolean;
    head: { sha: string; ref: string };
    base: { ref: string };
    html_url: string;
  };

  const pr = await githubFetch<PrRow>(
    account.accessToken,
    `/repos/${repo}/pulls/${prNumber}`,
  );

  return {
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    headSha: pr.head.sha,
    baseRef: pr.base.ref,
    headRef: pr.head.ref,
    htmlUrl: pr.html_url,
  };
}

export async function getPullRequestDiff(
  repo: string,
  prNumber: number,
  accountId?: string,
): Promise<string> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return "";

  const res = await fetch(`https://api.github.com/repos/${repo}/pulls/${prNumber}`, {
    headers: {
      Accept: "application/vnd.github.diff",
      Authorization: `Bearer ${account.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) return "";
  return res.text();
}

export async function getCompareDiff(
  repo: string,
  baseSha: string,
  headSha: string,
  accountId?: string,
): Promise<string> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return "";

  const res = await fetch(
    `https://api.github.com/repos/${repo}/compare/${baseSha}...${headSha}`,
    {
      headers: {
        Accept: "application/vnd.github.diff",
        Authorization: `Bearer ${account.accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!res.ok) return "";
  return res.text();
}

export async function postPullRequestComment(
  repo: string,
  prNumber: number,
  body: string,
  accountId?: string,
): Promise<boolean> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return false;

  await githubFetch(account.accessToken, `/repos/${repo}/issues/${prNumber}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  return true;
}

export async function requestPullRequestReviewers(
  repo: string,
  prNumber: number,
  reviewers: string[],
  accountId?: string,
): Promise<boolean> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account || reviewers.length === 0) return false;

  await githubFetch(account.accessToken, `/repos/${repo}/pulls/${prNumber}/requested_reviewers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewers }),
  });
  return true;
}

export async function listOpenPullRequests(
  repo: string,
  accountId?: string,
): Promise<GithubPullRequest[]> {
  const accounts = await getGithubAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : accounts[0];
  if (!account) return [];

  type PrRow = {
    number: number;
    title: string;
    state: string;
    draft: boolean;
    head: { sha: string; ref: string };
    base: { ref: string };
    html_url: string;
  };

  const prs = await githubFetch<PrRow[]>(
    account.accessToken,
    `/repos/${repo}/pulls?state=open&per_page=30`,
  );

  return prs.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    draft: pr.draft,
    headSha: pr.head.sha,
    baseRef: pr.base.ref,
    headRef: pr.head.ref,
    htmlUrl: pr.html_url,
  }));
}

export async function getLastReviewSha(
  automationId: string,
  repo: string,
  prNumber: number,
): Promise<string | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("agent_automation_runs")
    .select("metrics")
    .eq("automation_id", automationId)
    .eq("status", "success")
    .order("triggered_at", { ascending: false })
    .limit(20);

  for (const row of data ?? []) {
    const metrics = row.metrics as Record<string, unknown>;
    if (
      metrics.repo === repo &&
      String(metrics.prNumber) === String(prNumber) &&
      typeof metrics.headSha === "string"
    ) {
      return metrics.headSha;
    }
  }
  return null;
}
