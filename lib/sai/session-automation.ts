import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { spawnSession, activateScheduledSessions } from "./session-spawn";
import { computeNextDutyRun } from "./session-duties";

export type AutomationRule = {
  id: string;
  label: string;
  description: string;
  ruleType: "schedule" | "event" | "agent";
  triggerConfig: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
  projectId: string | null;
  templateSlug: string;
  status: "active" | "paused" | "draft";
  lastTriggeredAt: string | null;
  triggerCount: number;
};

type RuleRow = {
  id: string;
  label: string;
  description: string;
  rule_type: string;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
  project_id: string | null;
  template_slug: string;
  status: string;
  last_triggered_at: string | null;
  trigger_count: number;
};

function mapRule(row: RuleRow): AutomationRule {
  return {
    id: row.id,
    label: row.label,
    description: row.description,
    ruleType: row.rule_type as AutomationRule["ruleType"],
    triggerConfig: row.trigger_config ?? {},
    actionConfig: row.action_config ?? {},
    projectId: row.project_id,
    templateSlug: row.template_slug,
    status: row.status as AutomationRule["status"],
    lastTriggeredAt: row.last_triggered_at,
    triggerCount: row.trigger_count,
  };
}

function renderObjective(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "");
}

export async function getAutomationRules(): Promise<AutomationRule[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("session_automation_rules").select("*").order("label");

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as RuleRow[]).map(mapRule);
}

export async function getActiveAutomationRules(): Promise<AutomationRule[]> {
  const rules = await getAutomationRules();
  return rules.filter((r) => r.status === "active");
}

async function logAutomationRun(
  ruleId: string,
  sessionId: string | null,
  status: "success" | "skipped" | "failed",
  message: string,
): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("session_automation_runs").insert({
    rule_id: ruleId,
    session_id: sessionId,
    status,
    message,
  });
}

export async function triggerAutomationRule(
  ruleId: string,
  eventPayload: Record<string, string> = {},
): Promise<{ sessionId: string | null }> {
  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase
    .from("session_automation_rules")
    .select("*")
    .eq("id", ruleId)
    .maybeSingle();

  if (error || !row) throw new Error("Automation rule not found");
  const rule = mapRule(row as RuleRow);
  if (rule.status !== "active") {
    await logAutomationRun(ruleId, null, "skipped", "Rule not active");
    return { sessionId: null };
  }

  const objectiveTemplate = String(rule.actionConfig.objectiveTemplate ?? rule.label);
  const objective = renderObjective(objectiveTemplate, eventPayload);

  try {
    const result = await spawnSession({
      projectId: rule.projectId ?? "",
      objective,
      creationMode: "automation",
      templateSlug: rule.templateSlug,
      triggerMetadata: { ruleId: rule.id, ruleLabel: rule.label, ...eventPayload },
    });

    await supabase
      .from("session_automation_rules")
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: rule.triggerCount + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ruleId);

    await logAutomationRun(ruleId, result.sessionId, "success", `Created session #${result.sessionNumber}`);
    return { sessionId: result.sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Spawn failed";
    await logAutomationRun(ruleId, null, "failed", message);
    throw err;
  }
}

/** Evaluate schedule-based automation rules (cron stored in trigger_config). */
export async function runScheduledAutomations(): Promise<string[]> {
  const rules = await getActiveAutomationRules();
  const sessions: string[] = [];
  const now = new Date();

  for (const rule of rules.filter((r) => r.ruleType === "schedule")) {
    const cron = String(rule.triggerConfig.cron ?? "");
    if (!cron) continue;

    const lastTriggered = rule.lastTriggeredAt ? new Date(rule.lastTriggeredAt) : null;
    const minInterval = cron.includes("* * *") ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

    if (lastTriggered && now.getTime() - lastTriggered.getTime() < minInterval - 60_000) {
      continue;
    }

    try {
      const { sessionId } = await triggerAutomationRule(rule.id);
      if (sessionId) sessions.push(sessionId);
    } catch {
      // logged in triggerAutomationRule
    }
  }

  return sessions;
}

/** Fire event-based automations matching eventType. */
export async function fireAutomationEvent(
  eventType: string,
  payload: Record<string, string> = {},
): Promise<string[]> {
  const { activateTriggeredSessions } = await import("./session-spawn");
  const rules = await getActiveAutomationRules();
  const sessions: string[] = [];

  const triggered = await activateTriggeredSessions(eventType);
  sessions.push(...triggered.map((t) => t.sessionId));

  for (const rule of rules.filter((r) => r.ruleType === "event")) {
    if (rule.triggerConfig.eventType !== eventType) continue;
    try {
      const { sessionId } = await triggerAutomationRule(rule.id, payload);
      if (sessionId) sessions.push(sessionId);
    } catch {
      // logged
    }
  }

  return sessions;
}

/** Agent signal automation — e.g. CEO detects growth opportunity. */
export async function fireAgentAutomation(
  agentRole: string,
  signal: string,
  payload: Record<string, string> = {},
): Promise<string[]> {
  const rules = await getActiveAutomationRules();
  const sessions: string[] = [];

  for (const rule of rules.filter((r) => r.ruleType === "agent")) {
    if (rule.triggerConfig.agentRole !== agentRole || rule.triggerConfig.signal !== signal) continue;
    try {
      const { sessionId } = await triggerAutomationRule(rule.id, payload);
      if (sessionId) sessions.push(sessionId);
    } catch {
      // logged
    }
  }

  return sessions;
}

export async function runAutomationEngine(): Promise<{
  dutySessions: string[];
  automationSessions: string[];
  scheduledSessions: string[];
  recurringSessions: string[];
  triggeredSessions: string[];
  eventSessions: string[];
}> {
  const { runAllDueDuties } = await import("./session-duties");
  const { processRecurringSessions } = await import("./session-spawn");
  const dutyResult = await runAllDueDuties();
  const automationSessions = await runScheduledAutomations();
  const scheduled = await activateScheduledSessions();
  const recurring = await processRecurringSessions();
  const eventSessions = await fireSessionLifecycleEvents();

  return {
    dutySessions: dutyResult.sessions,
    automationSessions,
    scheduledSessions: scheduled.map((s) => s.sessionId),
    recurringSessions: recurring.map((s) => s.sessionId),
    triggeredSessions: [],
    eventSessions,
  };
}

export { computeNextDutyRun };

/** Detect overdue / delayed sessions and fire matching event automations. */
async function fireSessionLifecycleEvents(): Promise<string[]> {
  const { getFounderSessionTimeline } = await import("./founder-timeline");
  const { isSessionOverdue } = await import("./session-center");

  let timeline;
  try {
    timeline = await getFounderSessionTimeline();
  } catch {
    return [];
  }

  const sessions: string[] = [];
  const overdue = [
    ...timeline.activeSessions,
    ...timeline.blockedSessions,
    ...timeline.needsFounderReview,
  ].filter(isSessionOverdue);

  for (const session of overdue) {
    const triggered = await fireAutomationEvent("project_delayed", {
      sessionId: session.id,
      objective: session.objective,
      projectId: session.projectId,
    });
    sessions.push(...triggered);
  }

  if (timeline.blockedSessions.length > 0) {
    for (const session of timeline.blockedSessions.slice(0, 3)) {
      const triggered = await fireAutomationEvent("critical_incident", {
        sessionId: session.id,
        objective: session.objective,
        sessionStatus: session.sessionStatus,
      });
      sessions.push(...triggered);
    }
  }

  return sessions;
}
