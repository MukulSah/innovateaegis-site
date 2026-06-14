/** @deprecated Use session-finalization-engine.ts */
export {
  KNOWLEDGE_ARTIFACT,
  SESSION_FINAL_REPORT,
  EXECUTIVE_REVIEW,
  SESSION_CLOSED_ARTIFACT,
  recordFinalizationEvent,
  publishCompletionArtifacts,
  archiveSession,
  refreshDashboards,
  closeSession,
  finalizeSession,
  evaluateSessionFinalization,
  forceFinalizeSession,
  guardRecoveryFromCompletedSession,
  isSessionFinalizationPending,
  type FinalizationResult,
} from "./session-finalization-engine";
