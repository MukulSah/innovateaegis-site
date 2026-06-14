"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { parseJsonResponse } from "@/lib/sai/client-api";
import type { CompanyRecord } from "@/lib/sai/company-records";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type Summary = {
  sessionFiles: number;
  decisions: number;
  knowledge: number;
  architecture: number;
  sops: number;
  agentLearnings: number;
  total: number;
};

const RECORD_TYPES = [
  { id: "session_file", label: "Session Files" },
  { id: "decision", label: "Decisions" },
  { id: "knowledge", label: "Knowledge" },
  { id: "architecture", label: "Architecture" },
  { id: "sop", label: "SOPs" },
  { id: "agent_learning", label: "Agent Learnings" },
] as const;

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function RecordsCenterView({
  initialSummary,
  initialRecords,
  activeType,
  searchQuery,
}: {
  initialSummary: Summary;
  initialRecords: CompanyRecord[];
  activeType: string | null;
  searchQuery: string;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [records, setRecords] = useState(initialRecords);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    const [summaryRes, recordsRes] = await Promise.all([
      fetch("/api/sai/records?summary=1"),
      fetch(`/api/sai/records${params.size ? `?${params}` : ""}`),
    ]);

    const summaryData = await parseJsonResponse<{ summary?: Summary }>(summaryRes, "/api/sai/records?summary=1");
    const recordsData = await parseJsonResponse<{ records?: CompanyRecord[] }>(
      recordsRes,
      `/api/sai/records${params.size ? `?${params}` : ""}`,
    );

    if (summaryData.summary) setSummary(summaryData.summary);
    if (recordsData.records) setRecords(recordsData.records);
  }, [activeType, searchQuery]);

  const { connected: syncConnected } = useSaiRealtimeSync(
    () => {
      refresh().catch(() => {});
    },
    ["company_records", "session_intelligence", "workflow_runs"],
    { debounceMs: 2000, minIntervalMs: 4000 },
  );

  useEffect(() => {
    setConnected(syncConnected);
  }, [syncConnected]);

  useEffect(() => {
    setSummary(initialSummary);
    setRecords(initialRecords);
  }, [initialSummary, initialRecords]);

  const cards = [
    { label: "Session Files", value: summary.sessionFiles, type: "session_file" },
    { label: "Decisions", value: summary.decisions, type: "decision" },
    { label: "Knowledge", value: summary.knowledge, type: "knowledge" },
    { label: "Architecture", value: summary.architecture, type: "architecture" },
    { label: "SOPs", value: summary.sops, type: "sop" },
    { label: "Agent Learnings", value: summary.agentLearnings, type: "agent_learning" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-[10px] text-white/40">
        <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
        {connected ? "Live sync" : "Polling every 12s"}
        <span className="text-white/25">·</span>
        <span>{summary.total} records</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {cards.map((card) => (
          <Link
            key={card.type}
            href={`/sai/records?type=${card.type}`}
            className={`enterprise-glass rounded-xl border p-4 transition-colors hover:bg-white/[0.03] ${
              activeType === card.type ? "border-purple-400/40" : "border-white/10"
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider text-white/40">{card.label}</p>
            <p className="mt-1 text-xl font-bold text-white">{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">
            {activeType ? RECORD_TYPES.find((t) => t.id === activeType)?.label ?? "Records" : "All Records"}
          </h2>
          <form action="/sai/records" method="get" className="flex gap-2">
            {activeType && <input type="hidden" name="type" value={activeType} />}
            <input
              name="q"
              defaultValue={searchQuery}
              placeholder="Search records…"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white"
            />
          </form>
        </div>

        <ul className="mt-4 space-y-3">
          {records.length === 0 ? (
            <li className="py-8 text-center text-sm text-white/40">
              No records yet. Completed sessions automatically generate session files and knowledge records.
            </li>
          ) : (
            records.map((record) => (
              <li key={record.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-purple-300/70">
                      {record.recordType.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm font-medium text-white">{record.title}</p>
                    <p className="mt-1 text-xs text-white/50">{record.summary}</p>
                  </div>
                  <time className="text-[10px] text-white/35">{formatWhen(record.createdAt)}</time>
                </div>
                {record.sourceSessionId && (
                  <Link
                    href={`/sai/sessions/${record.sourceSessionId}`}
                    className="mt-2 inline-block text-[10px] text-cyan-300 hover:underline"
                  >
                    View source session →
                  </Link>
                )}
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
