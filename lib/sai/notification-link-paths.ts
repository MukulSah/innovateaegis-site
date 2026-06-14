import type { NotificationCategory } from "./types";

export type NotificationViewLink = {
  href: string;
  label: string;
};

export function staticEntityLink(entityType: string, entityId: string): NotificationViewLink | null {
  switch (entityType) {
    case "workflow":
      return { href: `/sai/workflows/${entityId}`, label: "View workflow" };
    case "project":
      return { href: `/sai/projects/${entityId}`, label: "View project" };
    case "approval":
      return { href: `/sai/approvals/${entityId}`, label: "View approval" };
    case "agent":
      return { href: `/sai/organization/agents/${entityId}/workspace`, label: "View agent" };
    case "release":
      return { href: "/sai/releases", label: "View releases" };
    case "decision":
    case "memory":
      return { href: "/sai/memory", label: "View in memory" };
    case "employee":
      return { href: "/sai/employees", label: "View team" };
    case "document":
      return { href: "/sai/execution", label: "View documents" };
    case "task":
      return { href: "/sai/tasks", label: "View tasks" };
    case "deliverable":
      return { href: "/sai/execution", label: "View deliverable" };
    default:
      return null;
  }
}

export function categoryFallbackLink(category: NotificationCategory): NotificationViewLink | null {
  switch (category) {
    case "APPROVAL":
      return { href: "/sai/approvals", label: "Open approvals" };
    case "ASSIGNMENT":
      return { href: "/sai/tasks", label: "View tasks" };
    case "WORKFLOW":
      return { href: "/sai/control", label: "View workflows" };
    case "DOCUMENT":
      return { href: "/sai/execution", label: "View execution" };
    case "ESCALATION":
      return { href: "/sai/approvals", label: "View escalations" };
    case "RELEASE":
      return { href: "/sai/releases", label: "View releases" };
    default:
      return null;
  }
}

export function resolveActivityFeedLink(entry: {
  targetType: string;
  targetId: string | null;
}): NotificationViewLink | null {
  if (!entry.targetId) return null;
  return (
    staticEntityLink(entry.targetType, entry.targetId) ?? {
      href: "/sai/execution",
      label: "View execution",
    }
  );
}
