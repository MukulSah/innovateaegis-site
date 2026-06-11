"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { resolveActivityFeedLink } from "@/lib/sai/notification-link-paths";
import type { NotificationWithLink } from "@/lib/sai/notification-links";
import type { ActivityFeedEntry } from "@/lib/sai/types";

type InboxData = {
  all: NotificationWithLink[];
  unread: NotificationWithLink[];
  approvals: NotificationWithLink[];
  assignments: NotificationWithLink[];
  mentions: NotificationWithLink[];
  escalations: NotificationWithLink[];
  workflowEvents: NotificationWithLink[];
  completedWork: NotificationWithLink[];
  recentActivity: NotificationWithLink[];
};

type Props = {
  inbox: InboxData;
  activityFeed: ActivityFeedEntry[];
  isAdmin: boolean;
};

const tabs = [
  { key: "unread", label: "Unread" },
  { key: "approvals", label: "Approvals" },
  { key: "assignments", label: "Assignments" },
  { key: "mentions", label: "Mentions" },
  { key: "escalations", label: "Escalations" },
  { key: "workflowEvents", label: "Workflow Events" },
  { key: "completedWork", label: "Completed Work" },
  { key: "recentActivity", label: "Recent Activity" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

const severityColor: Record<string, string> = {
  LOW: "text-white/40",
  MEDIUM: "text-amber-300/80",
  HIGH: "text-orange-300",
  CRITICAL: "text-red-300",
};

const categoryIcon: Record<string, string> = {
  APPROVAL: "✓",
  ASSIGNMENT: "▤",
  COMMENT: "💬",
  ESCALATION: "⚠",
  WORKFLOW: "⟳",
  RELEASE: "▲",
  DOCUMENT: "📄",
  SYSTEM: "◈",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

export function InboxView({ inbox, activityFeed, isAdmin }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("unread");
  const [loading, setLoading] = useState(false);

  const items = inbox[activeTab] ?? [];

  async function markRead(id: string) {
    await fetch(`/api/sai/notifications/${id}`, { method: "PATCH" });
    router.refresh();
  }

  async function markAllRead() {
    setLoading(true);
    await fetch("/api/sai/notifications", { method: "PATCH" });
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-purple-500/20 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}
            >
              {tab.label}
              {tab.key === "unread" && inbox.unread.length > 0 && (
                <span className="ml-1.5 rounded-full bg-purple-500 px-1.5 text-[10px]">
                  {inbox.unread.length}
                </span>
              )}
            </button>
          ))}
        </div>
        {isAdmin && inbox.unread.length > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            disabled={loading}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:bg-white/5"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        {activeTab === "recentActivity" ? (
          activityFeed.length === 0 ? (
            <p className="text-center text-sm text-white/40">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {activityFeed.map((entry) => {
                const link = resolveActivityFeedLink(entry);
                return (
                  <li
                    key={entry.id}
                    className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/85">{entry.action}</p>
                      <p className="mt-1 text-xs text-white/45">{entry.description}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-wider text-white/30">
                        {entry.actor} · {entry.targetType}
                      </p>
                      {link && (
                        <Link
                          href={link.href}
                          className="mt-2 inline-flex rounded-lg border border-purple-400/25 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-200 hover:bg-purple-500/20"
                        >
                          {link.label} →
                        </Link>
                      )}
                    </div>
                    <span className="text-[10px] text-white/35">{formatTime(entry.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-white/40">No notifications in this category.</p>
        ) : (
          <ul className="space-y-3">
            {items.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-3 ${
                  n.isRead ? "border-white/5 bg-white/[0.02]" : "border-purple-400/20 bg-purple-500/5"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="text-sm">{categoryIcon[n.category] ?? "◈"}</span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={n.href}
                        className="text-sm font-medium text-white hover:text-purple-200"
                      >
                        {n.title}
                      </Link>
                      {n.message && <p className="mt-1 text-xs text-white/50">{n.message}</p>}
                      <p className="mt-1 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider">
                        <span className="text-purple-300/60">{n.category}</span>
                        <span className={severityColor[n.severity]}>{n.severity}</span>
                      </p>
                      <Link
                        href={n.href}
                        className="mt-3 inline-flex rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200 transition-colors hover:bg-cyan-500/20"
                      >
                        {n.label} →
                      </Link>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-[10px] text-white/35">{formatTime(n.createdAt)}</span>
                    {!n.isRead && isAdmin && (
                      <button
                        type="button"
                        onClick={() => markRead(n.id)}
                        className="text-[10px] text-purple-300 hover:text-purple-200"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
