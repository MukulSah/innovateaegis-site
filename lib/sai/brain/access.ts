import "server-only";

import { agentCanAccessSection, type BrainSectionSlug } from "./structure.types";
import type { MemoryRecord } from "./types";

export function filterRecordsForAgent(
  records: MemoryRecord[],
  agentRole: string,
): MemoryRecord[] {
  return records.filter((record) => {
    if (!record.sectionSlug) return true;
    return agentCanAccessSection(agentRole, record.sectionSlug as BrainSectionSlug);
  });
}

export function filterRecordsForAgentRoles(
  records: MemoryRecord[],
  agentRoles: string[],
): MemoryRecord[] {
  if (!agentRoles.length) return records;
  return records.filter((record) => {
    if (!record.sectionSlug) return true;
    return agentRoles.some((role) =>
      agentCanAccessSection(role, record.sectionSlug as BrainSectionSlug),
    );
  });
}
