import { RecordsCenterView } from "@/components/sai/records-center-view";
import { getRecordsCenterSummary, getCompanyRecords } from "@/lib/sai/company-records";
import type { CompanyRecordType } from "@/lib/sai/session-types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ type?: string; q?: string }>;
};

const VALID_RECORD_TYPES = new Set<CompanyRecordType>([
  "session_file",
  "decision",
  "knowledge",
  "architecture",
  "sop",
  "agent_learning",
  "lesson",
  "recommendation",
]);

export default async function RecordsCenterPage({ searchParams }: Props) {
  const { type: rawType, q } = await searchParams;
  const type = rawType && VALID_RECORD_TYPES.has(rawType as CompanyRecordType)
    ? (rawType as CompanyRecordType)
    : undefined;
  const configured = isSupabaseConfigured();

  const [summary, records] = configured
    ? await Promise.all([
        getRecordsCenterSummary(),
        getCompanyRecords({ recordType: type, search: q, limit: 50 }),
      ])
    : [
        { sessionFiles: 0, decisions: 0, knowledge: 0, architecture: 0, sops: 0, agentLearnings: 0, total: 0 },
        [],
      ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Executive Briefing · Company Brain
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Records Center</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          Permanent organizational memory — session files, decisions, knowledge, architecture, SOPs, and agent learnings.
        </p>
      </header>

      <RecordsCenterView
        initialSummary={summary}
        initialRecords={records}
        activeType={type ?? null}
        searchQuery={q ?? ""}
      />
    </div>
  );
}
