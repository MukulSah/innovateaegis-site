import type { FounderSessionTimelineData } from "./founder-timeline";

/** Collect every session id from founder timeline buckets — nothing excluded. */
export function collectFounderSessionIds(timeline: FounderSessionTimelineData): string[] {
  const ids = new Set<string>();

  for (const row of timeline.activeSessions) ids.add(row.id);
  for (const row of timeline.awaitingApprovalSessions) ids.add(row.id);
  for (const row of timeline.scheduledSessions) ids.add(row.id);
  for (const row of timeline.blockedSessions) ids.add(row.id);
  for (const row of timeline.needsFounderReview) ids.add(row.id);
  for (const row of timeline.completedSessions) ids.add(row.id);
  for (const row of timeline.archivedSessions) ids.add(row.id);
  for (const row of timeline.cancelledSessions) ids.add(row.id);
  for (const approval of timeline.awaitingFounderApproval) {
    if (approval.workflowId) ids.add(approval.workflowId);
  }

  return [...ids];
}

/** Operational dashboard preview — active/blocked/review + limited completed (avoids fetch storm). */
export function collectOperationalSessionIds(
  timeline: FounderSessionTimelineData,
  limit = 8,
): string[] {
  const ids: string[] = [];
  const push = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };

  for (const row of timeline.activeSessions) push(row.id);
  for (const row of timeline.awaitingApprovalSessions) push(row.id);
  for (const row of timeline.scheduledSessions) push(row.id);
  for (const row of timeline.blockedSessions) push(row.id);
  for (const row of timeline.needsFounderReview) push(row.id);
  for (const row of timeline.completedSessions) {
    if (ids.length >= limit) break;
    push(row.id);
  }

  return ids.slice(0, limit);
}
