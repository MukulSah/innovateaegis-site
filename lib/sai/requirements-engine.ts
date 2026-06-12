import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getWorkflowApprovals } from "./governance";
import { addProjectMemory } from "./project-memory";
import { addTimelineEvent } from "./project-timeline";
import { getSessionArtifacts } from "./session-artifacts";
import { updateSessionStatePointers } from "./session-state-view";
import { deliverableArtifactName } from "./sdlc";

export const REQUIREMENTS_SECTIONS = [
  "Problem Statement",
  "Current User Impact",
  "Root Cause Hypothesis",
  "Functional Requirements",
  "Non-Functional Requirements",
  "Acceptance Criteria",
  "Success Metrics",
  "Risks",
  "Dependencies",
  "Open Questions",
  "Recommendation",
] as const;

export type RequirementsGateResult = {
  allowed: boolean;
  reason?: string;
  requirementsArtifactId?: string | null;
  approvalStatus?: "approved" | "pending" | "missing";
};

export function buildRequirementsTemplate(input: {
  projectName: string;
  objective: string;
  contextMarkdown?: string;
}): string {
  const contextBlock = input.contextMarkdown
    ? `\n## Context Reference\n\n${input.contextMarkdown.slice(0, 4000)}\n`
    : "";

  return `# Product Requirements Document

**Project:** ${input.projectName}
**Objective:** ${input.objective}
**Artifact:** requirements_v1

---

## Problem Statement

${input.objective}

## Current User Impact

Users are blocked or degraded until this objective is resolved. Quantify affected workflows and frequency.

## Root Cause Hypothesis

Initial hypothesis based on objective scope and available project context. Validate during architecture and implementation.

## Functional Requirements

- FR-1: Address the core failure described in the objective
- FR-2: Restore expected user workflow end-to-end
- FR-3: Provide clear error handling and user feedback on failure paths

## Non-Functional Requirements

- Reliability: stable under expected load
- Security: no regression to auth or data handling
- Observability: errors logged with actionable diagnostics

## Acceptance Criteria

- [ ] Primary user flow succeeds for the stated objective
- [ ] Regression checks pass for adjacent flows
- [ ] Validation and QA sign-off recorded

## Success Metrics

- Primary success rate improvement measurable post-release
- Error rate reduction for the affected flow
- User-reported incidents trend down within 2 weeks

## Risks

- Incomplete root cause may require iteration
- Dependency on external services or legacy components

## Dependencies

- Project resources and repository access configured
- Architecture review after founder approval

## Open Questions

- Edge cases requiring stakeholder input
- Priority trade-offs if scope expands

## Recommendation

Proceed to architecture after founder approval of this requirements document.
${contextBlock}`;
}

export function validateRequirementsDocument(content: string): { valid: boolean; missing: string[] } {
  const missing = REQUIREMENTS_SECTIONS.filter(
    (section) => !content.toLowerCase().includes(section.toLowerCase()),
  );
  return { valid: missing.length === 0, missing };
}

const REQUIREMENTS_ARTIFACT = deliverableArtifactName("requirements");

/** Architecture may not start until requirements_v1 exists and founder approval is complete. */
export async function canStartArchitecture(
  sessionId: string,
  projectId: string,
): Promise<RequirementsGateResult> {
  const artifacts = await getSessionArtifacts(sessionId);
  const requirementsArtifact = artifacts.find((a) => a.artifactName === REQUIREMENTS_ARTIFACT);
  if (!requirementsArtifact) {
    return {
      allowed: false,
      reason: `${REQUIREMENTS_ARTIFACT} not found — Product Manager must complete requirements first`,
      approvalStatus: "missing",
    };
  }

  const approvals = await getWorkflowApprovals({ workflowId: sessionId, status: "pending" });
  const pendingReq = approvals.find((a) => a.approvalType === "requirements");
  if (pendingReq) {
    return {
      allowed: false,
      reason: "Founder approval required for requirements before architecture",
      requirementsArtifactId: requirementsArtifact.id,
      approvalStatus: "pending",
    };
  }

  const { getWorkflowApprovals: getAllApprovals } = await import("./governance");
  const approved = await getAllApprovals({
    workflowId: sessionId,
    status: "approved",
  });
  const reqApproved = approved.some((a) => a.approvalType === "requirements");

  const supabase = createSupabaseAdmin();
  const { data: project } = await supabase
    .from("projects")
    .select("governance_profile, workflow_mode")
    .eq("id", projectId)
    .maybeSingle();

  const founderApprovalRequired =
    (project?.governance_profile as string | undefined) !== "autonomous";

  if (founderApprovalRequired && !reqApproved) {
    return {
      allowed: false,
      reason: "Requirements founder approval not recorded",
      requirementsArtifactId: requirementsArtifact.id,
      approvalStatus: "missing",
    };
  }

  return {
    allowed: true,
    requirementsArtifactId: requirementsArtifact.id,
    approvalStatus: reqApproved ? "approved" : "approved",
  };
}

export const REQUIREMENTS_PM_PROMPT = `You are a Product Manager agent. Generate a complete requirements_v1 document in markdown.

You MUST include ALL of these sections with substantive content:
${REQUIREMENTS_SECTIONS.map((s) => `- ${s}`).join("\n")}

Use the project context provided. Be specific to the objective — not generic boilerplate.
Output professional markdown suitable for founder approval before architecture begins.`;

/** Archive requirements_v1 through documentation pipeline + project memory + timeline. */
export async function processRequirementsArtifact(input: {
  sessionId: string;
  projectId: string;
  projectName: string;
  objective: string;
  artifactId: string;
  content: string;
  agentId: string;
  agentName: string;
}): Promise<void> {
  const deliverable = deliverableArtifactName("requirements");

  await addProjectMemory({
    projectId: input.projectId,
    memoryType: "requirement",
    title: `Requirements (${deliverable})`,
    summary: input.content.slice(0, 500),
    sourceType: "requirements_engine",
    sourceId: input.artifactId,
  });

  await addTimelineEvent({
    projectId: input.projectId,
    eventType: "requirements_published",
    title: `${deliverable} published`,
    description: `${input.agentName} completed requirements for: ${input.objective.slice(0, 200)}`,
    actorName: input.agentName,
    metadata: { sessionId: input.sessionId, artifactId: input.artifactId },
  });

  const supabase = createSupabaseAdmin();
  await supabase
    .from("project_deliverables")
    .update({ content: input.content.slice(0, 12000), title: "Product Requirements Document" })
    .eq("workflow_run_id", input.sessionId)
    .eq("workflow_step_key", "requirements");

  await updateSessionStatePointers({
    sessionId: input.sessionId,
    currentArtifactId: input.artifactId,
    currentArtifact: deliverable,
    currentDeliverable: deliverable,
    workflowStage: "requirements",
  });

  try {
    const { processArtifactDocumentation } = await import("./documentation-pipeline");
    const artifacts = await getSessionArtifacts(input.sessionId);
    const artifact = artifacts.find((a) => a.id === input.artifactId);
    if (artifact) {
      await processArtifactDocumentation({
        artifact,
        projectId: input.projectId,
        projectName: input.projectName,
      });
    }
  } catch {
    // Documentation pipeline is best-effort until Drive API is wired
  }
}

// Fix: processRequirementsArtifact references input.objectiveSummary which doesn't exist
// I'll fix in the write - use objective string param instead
