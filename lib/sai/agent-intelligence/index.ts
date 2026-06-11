export type {
  AgentIntelligenceRecord,
  AgentRoleKind,
  IntelligenceImpact,
  IntelligenceInput,
  IntelligencePriority,
  IntelligenceStatus,
  IntelligenceType,
} from "./types";
export {
  ACTIVE_INTELLIGENCE_STATUSES,
  FOUNDER_ALERT_TYPES,
  FOUNDER_DECISION_TYPES,
  FOUNDER_HEALTH_TYPES,
  FOUNDER_OPPORTUNITY_TYPES,
  FOUNDER_PRIORITY_TYPES,
  FOUNDER_RECOMMENDATION_TYPES,
  INTELLIGENCE_TYPES,
  defaultTtlDays,
  resolveAgentRoleKind,
} from "./types";

export {
  archiveExpiredIntelligence,
  getActiveIntelligence,
  getLatestExecutiveBriefing,
  storeIntelligenceRecord,
} from "./store";

export {
  generateAgentIntelligence,
  generateExecutiveBriefing,
  getIntelligenceForFounder,
  runIntelligenceEngine,
} from "./engine";
export type { IntelligenceEngineResult } from "./engine";

export { gatherAgentIntelligenceContext } from "./context";
export type { AgentIntelligenceContext } from "./context";
