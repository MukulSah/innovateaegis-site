import { createSupabaseAdmin } from "@/lib/supabase/admin";
import {
  getCompareDiff,
  getLastReviewSha,
  getPullRequestDiff,
  listOpenPullRequests,
  postPullRequestComment,
  requestPullRequestReviewers,
} from "./connectors/github-api";
import { processCooPendingApprovals } from "./coo-approval-engine";
import type { AutomationKind } from "./agent-automations";
import type { RepositoryScope } from "./agent-automations";

export type AutomationRunContext = {
  automationId?: string;
  automationKind?: AutomationKind;
  memoryEnabled?: boolean;
  tools?: unknown[];
  repositoryScope?: RepositoryScope;
  preferences?: Record<string, unknown>;
  triggerType?: string;
  repo?: string;
  prNumber?: string;
  prTitle?: string;
  headSha?: string;
  headRef?: string;
  baseRef?: string;
  isDraft?: string;
};

const AUTOMATION_PROMPTS: Record<AutomationKind, string> = {
  bugbot: `You are BugBot. Review the provided code diff for bugs, logic errors, edge cases, and regressions.
Output a markdown table with columns: Severity, Location (file:line), Finding — sorted by severity (Critical first).
If no issues found, state clearly "No issues found." Be precise and actionable.`,
  security: `You are a Security Analyst. Review the provided code for security vulnerabilities including injection, auth flaws, secrets exposure, and insecure dependencies.
Output a markdown table with columns: Severity, Location (file:line), Finding, Remediation — sorted by severity.
Escalate critical findings clearly.`,
  approval: `You are an Approval Agent. Based on the governance and PR context provided, produce an approval triage report.
Include: pending governance items reviewed, PRs assessed, reviewer requests recommended, and approve/escalate/block decisions with rationale.`,
  custom: `You are an automation agent. Complete the assigned task using the provided context professionally.`,
};

export async function loadAutomationContext(
  workflowId: string,
): Promise<AutomationRunContext | null> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("workflow_runs")
    .select("trigger_metadata")
    .eq("id", workflowId)
    .maybeSingle();

  if (!data?.trigger_metadata) return null;
  const meta = data.trigger_metadata as Record<string, unknown>;
  if (!meta.automationKind) return null;

  return {
    automationId: meta.automationId as string | undefined,
    automationKind: meta.automationKind as AutomationKind,
    memoryEnabled: meta.memoryEnabled as boolean | undefined,
    tools: meta.tools as unknown[] | undefined,
    repositoryScope: meta.repositoryScope as RepositoryScope | undefined,
    preferences: meta.preferences as Record<string, unknown> | undefined,
    triggerType: meta.triggerType as string | undefined,
    repo: meta.repo as string | undefined,
    prNumber: meta.prNumber as string | undefined,
    prTitle: meta.prTitle as string | undefined,
    headSha: meta.headSha as string | undefined,
    headRef: meta.headRef as string | undefined,
    baseRef: meta.baseRef as string | undefined,
    isDraft: meta.isDraft as string | undefined,
  };
}

export function isAutomationSession(ctx: AutomationRunContext | null): boolean {
  return Boolean(ctx?.automationKind);
}

export function getAutomationSystemPrompt(
  kind: AutomationKind,
  customInstructions?: string,
): string {
  const base = AUTOMATION_PROMPTS[kind] ?? AUTOMATION_PROMPTS.custom;
  if (customInstructions?.trim()) {
    return `${base}\n\n## Additional Instructions\n${customInstructions.trim()}`;
  }
  return base;
}

export async function buildAutomationContextBlock(
  ctx: AutomationRunContext,
  objective: string,
): Promise<string> {
  const parts: string[] = [`# Objective\n${objective}`];

  const scope = ctx.repositoryScope;
  const accountId = scope?.accountId;
  const repo = ctx.repo ?? scope?.repos?.[0];

  if (ctx.automationKind === "bugbot" && repo && ctx.prNumber) {
    const prNum = Number(ctx.prNumber);
    let diff = "";

    if (ctx.preferences?.incrementalReview && ctx.automationId && ctx.headSha) {
      const lastSha = await getLastReviewSha(ctx.automationId, repo, prNum);
      if (lastSha) {
        diff = await getCompareDiff(repo, lastSha, ctx.headSha, accountId);
      }
    }

    if (!diff) {
      diff = await getPullRequestDiff(repo, prNum, accountId);
    }

    parts.push(
      `# Pull Request\nRepo: ${repo}\nPR #${prNum}${ctx.prTitle ? `: ${ctx.prTitle}` : ""}\nHead: ${ctx.headRef ?? ""} (${ctx.headSha ?? ""})`,
    );
    if (diff) {
      parts.push(`# Diff\n\`\`\`diff\n${diff.slice(0, 120_000)}\n\`\`\``);
    } else {
      parts.push("# Diff\nNo diff available — review based on objective and project context.");
    }
  }

  if (ctx.automationKind === "security" && repo) {
    parts.push(
      `# Repository Scope\nProvider: ${scope?.provider ?? "github"}\nRepo: ${repo}\nBranch: ${ctx.baseRef ?? "main"}`,
    );
    parts.push(
      "# Security Scan Instructions\nPerform a security review of recently changed or high-risk areas. Focus on validated high-impact issues.",
    );
  }

  if (ctx.automationKind === "approval") {
    const cooProcessed = await processCooPendingApprovals();
    parts.push(`# Governance Triage\nCOO auto-processed ${cooProcessed} pending approval(s).`);

    if (repo) {
      const prs = await listOpenPullRequests(repo, accountId);
      if (prs.length > 0) {
        const prList = prs
          .slice(0, 15)
          .map((p) => `- PR #${p.number}: ${p.title} (${p.draft ? "draft" : "open"})`)
          .join("\n");
        parts.push(`# Open Pull Requests (${repo})\n${prList}`);
      }
    }
  }

  if (ctx.memoryEnabled && ctx.automationId) {
    parts.push(`# Automation Memory\nAutomation ID: ${ctx.automationId} — prior run context may apply.`);
  }

  return parts.join("\n\n");
}

export async function postAutomationActions(
  ctx: AutomationRunContext,
  output: string,
  workflowId: string,
  projectId?: string,
): Promise<Record<string, unknown>> {
  const metrics: Record<string, unknown> = {
    automationKind: ctx.automationKind,
    findingsCount: (output.match(/\|/g) ?? []).length > 3 ? Math.max(0, (output.match(/\n\|/g) ?? []).length - 1) : 0,
  };

  const repo = ctx.repo ?? ctx.repositoryScope?.repos?.[0];
  const accountId = ctx.repositoryScope?.accountId;

  if (ctx.automationKind === "bugbot" && repo && ctx.prNumber) {
    metrics.repo = repo;
    metrics.prNumber = ctx.prNumber;
    if (ctx.headSha) metrics.headSha = ctx.headSha;

    if (ctx.preferences?.prSummaries !== false) {
      const summary = output.length > 4000 ? `${output.slice(0, 4000)}…` : output;
      const posted = await postPullRequestComment(
        repo,
        Number(ctx.prNumber),
        `## BugBot Review\n\n${summary}`,
        accountId,
      );
      metrics.prCommentPosted = posted;
    }
  }

  if (ctx.automationKind === "approval" && repo) {
    const prs = await listOpenPullRequests(repo, accountId);
    const needsReview = prs.filter((p) => !p.draft).slice(0, 5);
    metrics.prsReviewed = needsReview.length;

    for (const pr of needsReview.slice(0, 2)) {
      await requestPullRequestReviewers(repo, pr.number, [], accountId);
    }
  }

  if (ctx.automationKind === "security") {
    const critical = /critical|high/i.test(output);
    metrics.hasCriticalFindings = critical;
    if (critical && workflowId) {
      const { requestWorkflowApproval } = await import("./governance");
      await requestWorkflowApproval({
        workflowId,
        projectId: projectId ?? "",
        approvalType: "security",
        title: "Security scan critical findings",
        description: "Automation security scan reported critical or high severity findings.",
        requestedBy: "Security Agent",
        artifactContent: output.slice(0, 3000),
      }).catch(() => undefined);
    }
  }

  return metrics;
}

export function shouldSkipGovernanceForAutomation(
  ctx: AutomationRunContext | null,
  approvalType: string | null,
): boolean {
  if (!ctx?.automationKind) return false;
  if (approvalType === "security" && ctx.automationKind === "security") return false;
  return true;
}
