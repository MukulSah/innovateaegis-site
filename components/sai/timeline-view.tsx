"use client";

import { useState } from "react";
import type { CompanyTimelineEvent, TimelineSeverity } from "@/lib/sai/types";

const severityColors: Record<TimelineSeverity, string> = {
  info: "text-white/50",
  low: "text-cyan-300/70",
  medium: "text-amber-300/70",
  high: "text-orange-300/80",
  critical: "text-red-300/80",
};

type Props = {
  initialEvents: CompanyTimelineEvent[];
};

export function TimelineView({ initialEvents }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState<TimelineSeverity | "">("");
  const [loading, setLoading] = useState(false);

  async function applyFilters() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (eventType) params.set("eventType", eventType);
    if (severity) params.set("severity", severity);
    const res = await fetch(`/api/sai/timeline?${params}`);
    const data = await res.json();
    if (res.ok) setEvents(data.events);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search timeline…"
          className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <input
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          placeholder="Event type"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as TimelineSeverity | "")}
          className="rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
        >
          <option value="">All severity</option>
          <option value="info">Info</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="button" onClick={applyFilters} disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white">
          Filter
        </button>
      </div>

      <div className="enterprise-glass rounded-xl border border-white/10 p-5">
        {events.length === 0 ? (
          <p className="text-center text-sm text-white/40">No timeline events found.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-4 border-b border-white/5 pb-3 last:border-0">
                <div className="shrink-0 text-[10px] text-white/35 w-36">
                  {new Date(event.createdAt).toLocaleString()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white/85">{event.title}</p>
                    <span className={`text-[10px] uppercase ${severityColors[event.severity]}`}>{event.severity}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/50">{event.description}</p>
                  <p className="mt-1 text-[10px] text-white/35">
                    {event.actor} · {event.eventType} · {event.entityType}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
