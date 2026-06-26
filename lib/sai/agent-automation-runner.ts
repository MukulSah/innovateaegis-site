import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { spawnSession } from "./session-spawn";
import {
  type AgentAutomation,
  getActiveAgentAutomations,
  getAgentAutomationById,
  logAutomationRun,
  computeAutomationNextRun,
  getCronTrigger,
} from "./agent-automations";
import { isCronDue, presetToCron } from "./cron-scheduler";

export type AutomationTriggerPayload = Record<string, string>;

function buildObjective(automation: AgentAutomation, payload: AutomationTriggerPayload): string {
  const base = automation.instructions.trim() || automation.name;
  const vars = Object.entries(payload)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  return vars ? `${base} — ${vars}` : base;
}

export async function triggerAgentAutomation(
  automationId: string,
  triggerType: string,
  payload: AutomationTriggerPayload = {},
): Promise<{ sessionId: string | null }> {
  const automation = await getAgentAutomationById(automationId);
  if (!automation) throw new Error("Automation not found");

  if (automation.status !== "active") {
    await logAutomationRun(automationId, null, triggerType, "skipped", "Automation not active");
    return { sessionId: null };
  }

  const objective = buildObjective(automation, payload);
  const supabase = createSupabaseAdmin();

  try {
    const result = await spawnSession({
      projectId: automation.projectId ?? "",
      objective,
      creationMode: "automation",
      templateSlug: automation.templateSlug,
      aiModelSelection: automation.modelSelection,
      triggerMetadata: {
        automationId: automation.id,
        automationKind: automation.automationKind,
        automationName: automation.name,
        memoryEnabled: automation.memoryEnabled,
        tools: automation.tools,
        repositoryScope: automation.repositoryScope,
        preferences: automation.preferences,
        triggerType,
        ...payload,
      },
    });

    const nextRunAt = computeAutomationNextRun(automation);

    await supabase
      .from("agent_automations")
      .update({
        last_run_at: new Date().toISOString(),
        run_count: automation.runCount + 1,
        next_run_at: nextRunAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", automationId);

    await logAutomationRun(
      automationId,
      result.sessionId,
      triggerType,
      "success",
      `Created session #${result.sessionNumber}`,
      { sessionNumber: result.sessionNumber, ...payload },
    );

    return { sessionId: result.sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Spawn failed";
    await logAutomationRun(automationId, null, triggerType, "failed", message, payload);
    throw err;
  }
}

export async function runDueAgentAutomations(): Promise<string[]> {
  const automations = await getActiveAgentAutomations();
  const sessions: string[] = [];
  const now = new Date();

  for (const automation of automations) {
    const cronTrigger = getCronTrigger(automation);
    if (!cronTrigger || cronTrigger.type !== "cron") continue;

    const cron = cronTrigger.preset ? presetToCron(cronTrigger.preset) : cronTrigger.cron;
    if (!isCronDue(cron, automation.lastRunAt, now)) continue;

    try {
      const { sessionId } = await triggerAgentAutomation(automation.id, "cron");
      if (sessionId) sessions.push(sessionId);
    } catch {
      // logged in triggerAgentAutomation
    }
  }

  return sessions;
}

export async function fireGitAutomations(
  event: "pr_opened" | "pr_pushed" | "pr_merged",
  repo: string,
  payload: AutomationTriggerPayload,
): Promise<string[]> {
  const automations = await getActiveAgentAutomations();
  const sessions: string[] = [];

  for (const automation of automations) {
    const gitTriggers = automation.triggers.filter(
      (t): t is Extract<typeof t, { type: "git" }> => t.type === "git",
    );

    for (const trigger of gitTriggers) {
      if (trigger.event !== event) continue;
      if (trigger.repos.length > 0 && !trigger.repos.includes(repo)) continue;

      if (automation.automationKind === "bugbot") {
        const prefs = automation.preferences;
        if (payload.isDraft === "true" && !prefs.reviewDraftPrs) continue;
      }

      try {
        const { sessionId } = await triggerAgentAutomation(automation.id, `git:${event}`, {
          repo,
          ...payload,
        });
        if (sessionId) sessions.push(sessionId);
      } catch {
        // logged
      }
    }
  }

  return sessions;
}
