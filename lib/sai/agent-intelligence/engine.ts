import "server-only";

import { getAgents } from "@/lib/sai/agents";
import { getFounderDisplayName } from "@/lib/sai/founder";
import { getMeetings } from "@/lib/sai/meetings";
import { gatherAgentIntelligenceContext } from "./context";
import { buildBriefingFromIntelligence } from "./briefing";
import { generateRoleIntelligence } from "./role-generators";
import {
  archiveExecutiveBriefings,
  archiveExpiredIntelligence,
  clearAgentOpenIntelligence,
  getActiveIntelligence,
  storeIntelligenceBatch,
  storeIntelligenceRecord,
} from "./store";
import type { AgentIntelligenceRecord } from "./types";
import { resolveAgentRoleKind } from "./types";

export type IntelligenceEngineResult = {
  agentsProcessed: number;
  recordsGenerated: number;
  expiredArchived: number;
  briefingGenerated: boolean;
};

export async function generateAgentIntelligence(agentId: string): Promise<AgentIntelligenceRecord[]> {
  const agents = await getAgents();
  const agent = agents.find((a) => a.id === agentId);
  if (!agent) throw new Error("Agent not found");
  if (agent.status === "disabled") return [];

  await archiveExpiredIntelligence();
  await clearAgentOpenIntelligence(agentId);

  const ctx = await gatherAgentIntelligenceContext(agent);
  const inputs = generateRoleIntelligence(ctx);
  return storeIntelligenceBatch(inputs);
}

export async function runIntelligenceEngine(): Promise<IntelligenceEngineResult> {
  const expiredArchived = await archiveExpiredIntelligence();
  const agents = await getAgents().then((list) => list.filter((a) => a.status !== "disabled"));

  let recordsGenerated = 0;
  for (const agent of agents) {
    await clearAgentOpenIntelligence(agent.id);
    const ctx = await gatherAgentIntelligenceContext(agent);
    const inputs = generateRoleIntelligence(ctx);
    const stored = await storeIntelligenceBatch(inputs);
    recordsGenerated += stored.length;
  }

  const briefingGenerated = await generateExecutiveBriefing();

  return {
    agentsProcessed: agents.length,
    recordsGenerated,
    expiredArchived,
    briefingGenerated,
  };
}

export async function generateExecutiveBriefing(): Promise<boolean> {
  const agents = await getAgents();
  const ceoAgent =
    agents.find((a) => resolveAgentRoleKind(a.role, a.name) === "ceo") ?? agents[0];
  if (!ceoAgent) return false;

  const [allRecords, meetings, founderName] = await Promise.all([
    getActiveIntelligence({ limit: 100 }),
    getMeetings({ status: "scheduled" }),
    getFounderDisplayName(),
  ]);

  const healthSignals = allRecords.filter((r) => r.intelligenceType === "health_signal");
  const overallHealthScore =
    healthSignals.length > 0
      ? Math.round(
          healthSignals.reduce((sum, s) => sum + (s.confidence ?? 70), 0) / healthSignals.length,
        )
      : 75;

  const founderFirstName = founderName.split(" ")[0];
  const { input } = buildBriefingFromIntelligence(
    ceoAgent,
    founderFirstName,
    allRecords.filter((r) => r.intelligenceType !== "executive_briefing"),
    meetings.length,
    overallHealthScore,
  );

  await archiveExecutiveBriefings();
  await storeIntelligenceRecord(input);
  return true;
}

export async function getIntelligenceForFounder(): Promise<AgentIntelligenceRecord[]> {
  await archiveExpiredIntelligence();
  return getActiveIntelligence({ limit: 100 });
}
