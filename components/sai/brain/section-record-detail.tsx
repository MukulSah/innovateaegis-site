"use client";

import type { MemoryRecord } from "@/lib/sai/brain/types";
import type { BrainSectionSlug } from "@/lib/sai/brain/structure.types";
import {
  SECTION_SCHEMAS,
  getRecordDisplaySummary,
  getRecordDisplayTitle,
} from "@/lib/sai/brain/section-schemas";

type Props = {
  record: MemoryRecord;
};

function formatValue(value: string, type: string): string {
  if (!value) return "—";
  if (type === "date" && value) {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  }
  if (type === "tags") {
    return value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .join(" · ");
  }
  return value;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function SectionRecordDetail({ record }: Props) {
  const sectionSlug = (record.sectionSlug ?? "") as BrainSectionSlug;
  const schema = sectionSlug ? SECTION_SCHEMAS[sectionSlug] : null;
  const fields = record.sectionFields ?? record.metadata?.fields ?? {};
  const title = getRecordDisplayTitle(record);
  const summary = getRecordDisplaySummary(record);

  if (!schema) {
    return (
      <div className="space-y-4">
        <header>
          <p className="text-[10px] uppercase tracking-wider text-purple-300/60">
            {record.layerName} · {record.categoryName}
          </p>
          <h2 className="mt-1 text-xl font-bold text-white">{record.title}</h2>
          <p className="mt-2 text-sm text-white/55">{record.description}</p>
        </header>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="whitespace-pre-wrap text-sm text-white/70">{record.content || "—"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-[10px] font-medium text-purple-200">
            {schema.recordType}
          </span>
          <span className="text-[10px] text-white/35">
            {record.layerName} · {record.categoryName}
          </span>
        </div>
        <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
        {summary && summary !== title && (
          <p className="mt-2 text-sm text-white/55">{summary}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/40">
          <span>v{record.version}</span>
          <span>Owner: {record.ownerAgentName || "Unassigned"}</span>
          <span>Dept: {record.department || "—"}</span>
          <span>Approved: {record.approvedBy || "Pending"}</span>
          <span>Visibility: {record.visibility}</span>
          <span>Updated {formatDate(record.updatedAt)}</span>
        </div>
      </header>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          {schema.title} Fields
        </p>
        <dl className="grid gap-4 sm:grid-cols-2">
          {schema.fields.map((field) => {
            const value = fields[field.key] ?? "";
            const isLong = field.type === "textarea" || value.length > 80;
            return (
              <div key={field.key} className={isLong ? "sm:col-span-2" : ""}>
                <dt className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-sm text-white/75">
                  {formatValue(value, field.type)}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>

      {record.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {record.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
