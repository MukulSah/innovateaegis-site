import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { spawnSession } from "./session-spawn";

export type SessionDuty = {
  id: string;
  title: string;
  description: string;
  agentRole: string;
  agentId: string | null;
  projectId: string | null;
  templateSlug: string;
  cadence: string;
  timezone: string;
  objectiveTemplate: string;
  status: "active" | "paused" | "pending";
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastSessionId: string | null;
  runCount: number;
};

type DutyRow = {
  id: string;
  title: string;
  description: string;
  agent_role: string;
  agent_id: string | null;
  project_id: string | null;
  template_slug: string;
  cadence: string;
  timezone: string;
  objective_template: string;
  status: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_session_id: string | null;
  run_count: number;
};

function mapDuty(row: DutyRow): SessionDuty {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    agentRole: row.agent_role,
    agentId: row.agent_id,
    projectId: row.project_id,
    templateSlug: row.template_slug,
    cadence: row.cadence,
    timezone: row.timezone,
    objectiveTemplate: row.objective_template,
    status: row.status as SessionDuty["status"],
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    lastSessionId: row.last_session_id,
    runCount: row.run_count,
  };
}

export function computeNextDutyRun(cadence: string, from = new Date()): string {
  const ms = cadence.includes("* * *")
    ? 24 * 60 * 60 * 1000
    : cadence.includes("* * 1") || cadence.includes("* * 5") || cadence.includes("* * 3")
      ? 7 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;
  return new Date(from.getTime() + ms).toISOString();
}

export async function getSessionDuties(): Promise<SessionDuty[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_duties")
    .select("*")
    .order("title");

  if (error) {
    if (error.message.includes("does not exist")) return [];
    throw new Error(error.message);
  }
  return ((data ?? []) as DutyRow[]).map(mapDuty);
}

export async function getDueDuties(): Promise<SessionDuty[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("session_duties")
    .select("*")
    .eq("status", "active")
    .lte("next_run_at", now);

  if (error) return [];
  return ((data ?? []) as DutyRow[]).map(mapDuty);
}

export async function runDuty(dutyId: string, force = false): Promise<{ sessionId: string | null; skipped: boolean }> {
  const supabase = createSupabaseAdmin();
  const { data: row, error } = await supabase.from("session_duties").select("*").eq("id", dutyId).maybeSingle();
  if (error || !row) throw new Error("Duty not found");

  const duty = mapDuty(row as DutyRow);
  if (duty.status !== "active" && !force) return { sessionId: null, skipped: true };

  if (!force && duty.nextRunAt && new Date(duty.nextRunAt) > new Date()) {
    return { sessionId: null, skipped: true };
  }

  const agents = await getAgents();
  const agent = duty.agentId
    ? agents.find((a) => a.id === duty.agentId)
    : findAgentForRole(agents, [duty.agentRole]);

  const objective = duty.objectiveTemplate || duty.title;
  const result = await spawnSession({
    projectId: duty.projectId ?? "",
    objective: `${objective}${agent ? ` — ${agent.name}` : ""}`,
    creationMode: "duty",
    templateSlug: duty.templateSlug,
    triggerMetadata: { dutyId: duty.id, dutyTitle: duty.title },
  });

  const now = new Date();
  await supabase
    .from("session_duties")
    .update({
      last_run_at: now.toISOString(),
      last_session_id: result.sessionId,
      next_run_at: computeNextDutyRun(duty.cadence, now),
      run_count: duty.runCount + 1,
      updated_at: now.toISOString(),
    })
    .eq("id", dutyId);

  return { sessionId: result.sessionId, skipped: false };
}

export async function runAllDueDuties(): Promise<{ ran: number; sessions: string[] }> {
  const due = await getDueDuties();
  const sessions: string[] = [];

  for (const duty of due) {
    try {
      const { sessionId, skipped } = await runDuty(duty.id);
      if (sessionId && !skipped) sessions.push(sessionId);
    } catch (err) {
      console.error(`[session-duties] failed duty ${duty.id}:`, err);
    }
  }

  return { ran: sessions.length, sessions };
}

export async function updateDutyStatus(
  dutyId: string,
  status: SessionDuty["status"],
): Promise<SessionDuty> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_duties")
    .update({ status, updated_at: new Date().toISOString() })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapDuty(data as DutyRow);
}

export type CreateDutyInput = {
  title: string;
  description?: string;
  agentRole?: string;
  cadence?: string;
  objectiveTemplate?: string;
  templateSlug?: string;
};

export async function createSessionDuty(input: CreateDutyInput): Promise<SessionDuty> {
  const supabase = createSupabaseAdmin();
  const cadence = input.cadence ?? "0 9 * * 1";
  const nextRunAt = computeNextDutyRun(cadence);

  const { data, error } = await supabase
    .from("session_duties")
    .insert({
      title: input.title,
      description: input.description ?? input.title,
      agent_role: input.agentRole ?? "COO",
      template_slug: input.templateSlug ?? "duty_session",
      cadence,
      objective_template: input.objectiveTemplate ?? input.title,
      status: "active",
      next_run_at: nextRunAt,
      metadata: { createdBy: "ai_scheduler" },
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapDuty(data as DutyRow);
}

/** Parse natural language into a duty plan (AI when available, deterministic fallback). */
export async function planSchedulerDutyFromPrompt(prompt: string): Promise<CreateDutyInput> {
  const { resolveDefaultProviderConfig } = await import("./ai-provider-resolver");
  const { generateAICompletion } = await import("./ai-client");
  const provider = await resolveDefaultProviderConfig();

  if (provider?.apiKey) {
    try {
      const result = await generateAICompletion({
        providerName: provider.providerName,
        apiKey: provider.apiKey,
        endpoint: provider.endpoint,
        model: provider.model,
        systemPrompt: `You plan COS scheduler duties. Return ONLY valid JSON with keys: title, description, agentRole (CEO|COO|PM|CTO), cadence (cron like "0 9 * * 1"), objectiveTemplate, templateSlug (duty_session).`,
        userPrompt: prompt,
        maxTokens: 600,
        temperature: 0.2,
        timeoutMs: 45_000,
      });
      const parsed = JSON.parse(result.content.replace(/```json\n?|\n?```/g, "").trim()) as CreateDutyInput;
      if (parsed.title) return parsed;
    } catch {
      // fallback below
    }
  }

  const lower = prompt.toLowerCase();
  let agentRole = "COO";
  if (lower.includes("ceo")) agentRole = "CEO";
  else if (lower.includes("pm") || lower.includes("product")) agentRole = "PM";
  else if (lower.includes("cto") || lower.includes("engineer")) agentRole = "CTO";

  let cadence = "0 9 * * 1";
  if (lower.includes("daily")) cadence = "0 9 * * *";
  else if (lower.includes("monthly")) cadence = "0 9 1 * *";
  else if (lower.includes("friday")) cadence = "0 9 * * 5";

  return {
    title: prompt.slice(0, 120),
    description: prompt,
    agentRole,
    cadence,
    objectiveTemplate: prompt,
    templateSlug: "duty_session",
  };
}

export async function createSessionDutyFromAiPrompt(prompt: string): Promise<SessionDuty> {
  const plan = await planSchedulerDutyFromPrompt(prompt);
  return createSessionDuty(plan);
}
