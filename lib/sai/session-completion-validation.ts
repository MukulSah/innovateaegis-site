import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProjectIntegrations } from "./connectors/project-integrations";
import { getSessionArtifacts } from "./session-artifacts";
import { getWorkflowRunById } from "./workflows";
import type { SessionStatus, SessionType } from "./types";

export type CompletionCheckResult = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  required: boolean;
};

export type SessionCompletionValidation = {
  passed: boolean;
  checks: CompletionCheckResult[];
  deliveryOutcome: string;
  sessionType: SessionType;
  summary: string;
};

const CODE_SESSION_TYPES = new Set<SessionType>(["development", "production_fix"]);

function inferSessionType(objective: string, sessionType?: SessionType | null): SessionType {
  if (sessionType) return sessionType;
  const o = objective.toLowerCase();
  if (o.includes("fix") || o.includes("bug") || o.includes("production")) return "production_fix";
  if (o.includes("deploy")) return "deployment";
  if (o.includes("architect")) return "architecture";
  if (o.includes("implement") || o.includes("code") || o.includes("build")) return "development";
  if (o.includes("document")) return "documentation_only";
  return "planning";
}

async function hasGithubEvidence(projectId: string, sessionId: string): Promise<boolean> {
  const integrations = await getProjectIntegrations(projectId);
  const hasGithub = integrations.some((i) => i.provider === "github" && i.config?.repo);
  if (!hasGithub) return false;

  const supabase = createSupabaseAdmin();
  const { data: resources } = await supabase
    .from("project_resources")
    .select("metadata")
    .eq("project_id", projectId)
    .eq("resource_type", "repository")
    .limit(5);

  const resourceEvidence = (resources ?? []).some((r) => {
    const meta = r.metadata as Record<string, unknown> | null;
    return Boolean(meta?.lastCommitAt || meta?.lastPullRequestAt || meta?.commitSha);
  });
  if (resourceEvidence) return true;

  const { data: activity } = await supabase
    .from("activity_feed")
    .select("id")
    .eq("target_id", sessionId)
    .ilike("action", "%github%")
    .limit(1);
  if (activity?.length) return true;

  const artifacts = await getSessionArtifacts(sessionId);
  return artifacts.some(
    (a) =>
      a.stepKey === "implementation" &&
      (a.outputSummary?.includes("commit") ||
        a.outputSummary?.includes("pull request") ||
        a.outputSummary?.includes("PR #")),
  );
}

export async function validateSessionCompletion(
  sessionId: string,
): Promise<SessionCompletionValidation> {
  const session = await getWorkflowRunById(sessionId);
  if (!session) {
    return {
      passed: false,
      checks: [],
      deliveryOutcome: "Session not found",
      sessionType: "planning",
      summary: "Cannot validate — session missing.",
    };
  }

  const supabase = createSupabaseAdmin();
  const { data: runMeta } = await supabase
    .from("workflow_runs")
    .select("trigger_metadata, strategic_brief, creation_mode")
    .eq("id", sessionId)
    .maybeSingle();

  const triggerMeta = (runMeta?.trigger_metadata as Record<string, unknown>) ?? {};
  const brief = (runMeta?.strategic_brief as Record<string, unknown>) ?? {};
  const isAgentAutomation =
    runMeta?.creation_mode === "automation" &&
    (triggerMeta.automationKind || brief.sessionTemplate);

  if (isAgentAutomation) {
    const artifacts = await getSessionArtifacts(sessionId);
    const hasOutput = artifacts.length > 0;
    return {
      passed: hasOutput,
      checks: [
        {
          id: "automation_output",
          label: "Automation deliverable produced",
          passed: hasOutput,
          detail: hasOutput
            ? `${artifacts.length} artifact(s) from automation run.`
            : "No automation artifact produced.",
          required: true,
        },
      ],
      deliveryOutcome: hasOutput ? "Automation completed" : "Automation incomplete",
      sessionType: "automation",
      summary: hasOutput
        ? "Minimal automation session completed successfully."
        : "Automation session missing required output.",
    };
  }

  const sessionType = inferSessionType(
    session.objective,
    (session as { sessionType?: SessionType }).sessionType,
  );
  const artifacts = await getSessionArtifacts(sessionId);
  const artifactNames = artifacts.map((a) => a.artifactName ?? a.stepKey);

  const qaReport = artifacts.some(
    (a) => a.stepKey === "validation" || (a.artifactName ?? "").includes("test"),
  );
  const deploymentArtifact = artifacts.some(
    (a) => a.stepKey === "deployment" || (a.artifactName ?? "").includes("deployment"),
  );
  const requirementsArtifact = artifacts.some(
    (a) => a.stepKey === "requirements" || (a.artifactName ?? "").includes("requirements"),
  );
  const githubEvidence = await hasGithubEvidence(session.projectId, sessionId);

  const checks: CompletionCheckResult[] = [
    {
      id: "requirements",
      label: "Acceptance criteria documented",
      passed: requirementsArtifact,
      detail: requirementsArtifact
        ? "Requirements artifact present."
        : "No requirements artifact found.",
      required: true,
    },
    {
      id: "qa",
      label: "QA report exists",
      passed: qaReport,
      detail: qaReport ? "Validation/test artifact present." : "No QA validation artifact.",
      required: CODE_SESSION_TYPES.has(sessionType),
    },
    {
      id: "deployment",
      label: "Deployment artifact exists",
      passed: deploymentArtifact,
      detail: deploymentArtifact
        ? "Deployment plan artifact present."
        : "No deployment artifact.",
      required: sessionType === "deployment" || sessionType === "production_fix",
    },
    {
      id: "github",
      label: "GitHub commit or pull request evidence",
      passed: githubEvidence,
      detail: githubEvidence
        ? "Repository activity or implementation evidence found."
        : "No GitHub commit/PR evidence linked to this session.",
      required: CODE_SESSION_TYPES.has(sessionType),
    },
  ];

  const requiredFailed = checks.filter((c) => c.required && !c.passed);
  const passed = requiredFailed.length === 0;

  let deliveryOutcome: string;
  if (passed) {
    deliveryOutcome =
      CODE_SESSION_TYPES.has(sessionType) && githubEvidence
        ? "Objective Delivered — Implementation Verified"
        : CODE_SESSION_TYPES.has(sessionType)
          ? "Documentation Completed — Implementation Not Verified"
          : "Session Objectives Completed";
  } else {
    deliveryOutcome = "Documentation Completed — Implementation Not Verified";
  }

  const summary = passed
    ? `All required validation checks passed for ${sessionType} session.`
    : `Validation failed: ${requiredFailed.map((c) => c.label).join(", ")}.`;

  return { passed, checks, deliveryOutcome, sessionType, summary };
}

export async function applySessionCompletionValidation(
  sessionId: string,
): Promise<{ closed: boolean; sessionStatus: SessionStatus; validation: SessionCompletionValidation }> {
  const validation = await validateSessionCompletion(sessionId);
  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: wf } = await supabase
    .from("workflow_runs")
    .select("project_id")
    .eq("id", sessionId)
    .maybeSingle();

  let effectiveValidation = validation;
  if (!validation.passed && wf?.project_id) {
    const { getProjectGovernance } = await import("./governance");
    const { isHandsOffGovernance, isProjectHandsOff, findCooActor } = await import("./coo-approval-engine");
    const { governanceProfile, workflowMode } = await getProjectGovernance(wf.project_id as string);
    if ((await isProjectHandsOff(wf.project_id as string)) || isHandsOffGovernance(governanceProfile, workflowMode)) {
      const coo = await findCooActor();
      effectiveValidation = {
        ...validation,
        passed: true,
        deliveryOutcome: `COO accepted (${coo?.name ?? "COO"}): ${validation.deliveryOutcome}`,
        summary: `Hands-off closure — COO approved session completion with documented caveats. ${validation.summary}`,
      };
    }
  }

  const { error: extendedError } = await supabase
    .from("workflow_runs")
    .update({
      completion_validation: effectiveValidation,
      delivery_outcome: effectiveValidation.deliveryOutcome,
      session_type: effectiveValidation.sessionType,
    })
    .eq("id", sessionId);

  if (extendedError && !extendedError.message.includes("does not exist")) {
    throw new Error(extendedError.message);
  }

  if (!effectiveValidation.passed) {
    let reviewStatus: SessionStatus = "needs_founder_review";
    let { error: statusError } = await supabase
      .from("workflow_runs")
      .update({
        session_status: reviewStatus,
        status: "running",
        last_activity_at: now,
      })
      .eq("id", sessionId);

    if (statusError?.message.includes("violates check constraint")) {
      reviewStatus = "blocked";
      ({ error: statusError } = await supabase
        .from("workflow_runs")
        .update({
          session_status: reviewStatus,
          status: "running",
          last_activity_at: now,
        })
        .eq("id", sessionId));
    }

    if (statusError && !statusError.message.includes("does not exist")) {
      throw new Error(statusError.message);
    }

    return { closed: false, sessionStatus: reviewStatus, validation: effectiveValidation };
  }

  return { closed: true, sessionStatus: "completed", validation: effectiveValidation };
}
