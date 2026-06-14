import { addProjectMemory, getProjectMemory } from "./project-memory";
import type { ProjectMemoryEntry } from "./types";

export const MEMORY_COMPRESSION_THRESHOLD = 25;
export const MEMORY_SUMMARY_TITLE = "memory_summary_v1";
export const MEMORY_SUMMARY_SOURCE = "memory_compression_v1";

export type BudgetedProjectMemory = {
  entries: ProjectMemoryEntry[];
  compressed: boolean;
  recordCount: number;
  summaryMarkdown: string | null;
};

function isSummaryRecord(entry: ProjectMemoryEntry): boolean {
  return (
    entry.title === MEMORY_SUMMARY_TITLE ||
    entry.sourceType === MEMORY_SUMMARY_SOURCE
  );
}

function buildDeterministicSummary(entries: ProjectMemoryEntry[]): string {
  const byType = new Map<string, ProjectMemoryEntry[]>();
  for (const entry of entries) {
    const list = byType.get(entry.memoryType) ?? [];
    list.push(entry);
    byType.set(entry.memoryType, list);
  }

  const lines: string[] = [
    "# Project Memory Summary",
    `Compressed from ${entries.length} records.`,
    "",
  ];

  for (const [type, items] of byType) {
    lines.push(`## ${type} (${items.length})`);
    for (const item of items.slice(0, 5)) {
      const summary = item.summary?.trim() || "(no summary)";
      lines.push(`- **${item.title}**: ${summary.slice(0, 180)}`);
    }
    if (items.length > 5) {
      lines.push(`- _…and ${items.length - 5} more ${type} records_`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/** Returns raw records or a cached/generated summary when count exceeds threshold. */
export async function getBudgetedProjectMemory(projectId: string): Promise<BudgetedProjectMemory> {
  const all = await getProjectMemory(projectId);
  const raw = all.filter((entry) => !isSummaryRecord(entry));
  const cachedSummary = all.find(isSummaryRecord);

  if (raw.length <= MEMORY_COMPRESSION_THRESHOLD) {
    return {
      entries: raw,
      compressed: false,
      recordCount: raw.length,
      summaryMarkdown: null,
    };
  }

  if (cachedSummary) {
    return {
      entries: [cachedSummary],
      compressed: true,
      recordCount: raw.length,
      summaryMarkdown: `# ${cachedSummary.title}\n\n${cachedSummary.summary}`,
    };
  }

  const summaryMarkdown = buildDeterministicSummary(raw);
  const saved = await addProjectMemory({
    projectId,
    memoryType: "knowledge",
    title: MEMORY_SUMMARY_TITLE,
    summary: summaryMarkdown,
    sourceType: MEMORY_SUMMARY_SOURCE,
  });

  return {
    entries: [saved],
    compressed: true,
    recordCount: raw.length,
    summaryMarkdown,
  };
}
