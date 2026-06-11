import "server-only";

import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  categoryFallbackLink,
  staticEntityLink,
  type NotificationViewLink,
} from "./notification-link-paths";
import type { Notification } from "./types";

export type { NotificationViewLink } from "./notification-link-paths";

export type NotificationWithLink = Notification & NotificationViewLink;

async function loadEntityMaps(notifications: Notification[]) {
  const supabase = createSupabaseAdmin();
  const docIds: string[] = [];
  const taskIds: string[] = [];
  const deliverableIds: string[] = [];

  for (const n of notifications) {
    if (!n.entityId) continue;
    if (n.entityType === "document") docIds.push(n.entityId);
    if (n.entityType === "task") taskIds.push(n.entityId);
    if (n.entityType === "deliverable") deliverableIds.push(n.entityId);
  }

  const [docs, tasks, deliverables] = await Promise.all([
    docIds.length
      ? supabase.from("documents").select("id, project_id, workflow_id").in("id", [...new Set(docIds)])
      : Promise.resolve({ data: [] }),
    taskIds.length
      ? supabase.from("tasks").select("id, project_id, workflow_run_id").in("id", [...new Set(taskIds)])
      : Promise.resolve({ data: [] }),
    deliverableIds.length
      ? supabase
          .from("deliverables")
          .select("id, project_id, workflow_id")
          .in("id", [...new Set(deliverableIds)])
      : Promise.resolve({ data: [] }),
  ]);

  return {
    documents: new Map((docs.data ?? []).map((d) => [d.id as string, d])),
    tasks: new Map((tasks.data ?? []).map((t) => [t.id as string, t])),
    deliverables: new Map((deliverables.data ?? []).map((d) => [d.id as string, d])),
  };
}

function resolveLink(
  notification: Notification,
  maps: Awaited<ReturnType<typeof loadEntityMaps>>,
): NotificationViewLink | null {
  const { entityType, entityId, category } = notification;

  if (entityType && entityId) {
    const direct = staticEntityLink(entityType, entityId);
    if (direct && entityType !== "document" && entityType !== "task" && entityType !== "deliverable") {
      return direct;
    }

    if (entityType === "document") {
      const doc = maps.documents.get(entityId);
      if (doc?.workflow_id) {
        return { href: `/sai/workflows/${doc.workflow_id}`, label: "View document" };
      }
      if (doc?.project_id) {
        return { href: `/sai/projects/${doc.project_id}`, label: "View in project" };
      }
    }

    if (entityType === "task") {
      const task = maps.tasks.get(entityId);
      if (task?.workflow_run_id) {
        return { href: `/sai/workflows/${task.workflow_run_id}`, label: "View task workflow" };
      }
      if (task?.project_id) {
        return { href: `/sai/projects/${task.project_id}`, label: "View task" };
      }
      return { href: "/sai/tasks", label: "View tasks" };
    }

    if (entityType === "deliverable") {
      const deliverable = maps.deliverables.get(entityId);
      if (deliverable?.workflow_id) {
        return { href: `/sai/workflows/${deliverable.workflow_id}`, label: "View deliverable" };
      }
      if (deliverable?.project_id) {
        return { href: `/sai/projects/${deliverable.project_id}`, label: "View in project" };
      }
      return { href: "/sai/execution", label: "View execution board" };
    }

    if (direct) return direct;
  }

  return categoryFallbackLink(category);
}

export async function enrichNotificationsWithLinks(
  notifications: Notification[],
): Promise<NotificationWithLink[]> {
  if (!isSupabaseConfigured() || notifications.length === 0) {
    return notifications.map((n) => {
      const link = categoryFallbackLink(n.category);
      return {
        ...n,
        href: link?.href ?? "/sai/inbox",
        label: link?.label ?? "View details",
      };
    });
  }

  const maps = await loadEntityMaps(notifications);

  return notifications.map((n) => {
    const link = resolveLink(n, maps) ?? categoryFallbackLink(n.category);
    return {
      ...n,
      href: link?.href ?? "/sai/inbox",
      label: link?.label ?? "View details",
    };
  });
}

export async function enrichInboxData<T extends Record<string, Notification[]>>(
  inbox: T,
): Promise<{ [K in keyof T]: NotificationWithLink[] }> {
  const allKeys = Object.keys(inbox) as (keyof T)[];
  const uniqueById = new Map<string, Notification>();
  for (const key of allKeys) {
    for (const n of inbox[key]) {
      uniqueById.set(n.id, n);
    }
  }

  const enriched = await enrichNotificationsWithLinks([...uniqueById.values()]);
  const enrichedMap = new Map(enriched.map((n) => [n.id, n]));

  const result = {} as { [K in keyof T]: NotificationWithLink[] };
  for (const key of allKeys) {
    result[key] = inbox[key].map((n) => enrichedMap.get(n.id)!);
  }
  return result;
}
