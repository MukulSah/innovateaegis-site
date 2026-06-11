"use client";

import type { Agent } from "@/lib/sai/types";
import type { BrainSectionSlug } from "@/lib/sai/brain/structure.types";
import {
  SECTION_SCHEMAS,
  type SectionFieldSchema,
  type SectionFields,
} from "@/lib/sai/brain/section-schemas";

export type SectionFormCommon = {
  ownerAgentId: string;
  ownerAgentName: string;
  department: string;
  approvedBy: string;
  effectiveDate: string;
  visibility: string;
};

type Props = {
  sectionSlug: BrainSectionSlug;
  sectionName: string;
  fields: SectionFields;
  common: SectionFormCommon;
  agents: Agent[];
  errors: Record<string, string>;
  onFieldChange: (key: string, value: string) => void;
  onCommonChange: (key: keyof SectionFormCommon, value: string) => void;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30";
const labelClass = "mb-1 block text-[11px] font-medium text-white/55";

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: SectionFieldSchema;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const id = `field-${field.key}`;

  return (
    <div className={field.colSpan === 2 ? "col-span-2" : ""}>
      <label htmlFor={id} className={labelClass}>
        {field.label}
        {field.required && <span className="text-purple-300"> *</span>}
      </label>
      {field.type === "textarea" ? (
        <textarea
          id={id}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={field.rows ?? 3}
          className={inputClass}
        />
      ) : field.type === "select" ? (
        <select
          id={id}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        >
          <option value="">Select…</option>
          {field.options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type === "date" ? "date" : field.type === "number" ? "number" : "text"}
          required={field.required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? (field.type === "tags" ? "Comma-separated" : undefined)}
          className={inputClass}
        />
      )}
      {error && <p className="mt-1 text-[10px] text-red-300">{error}</p>}
    </div>
  );
}

export function SectionRecordForm({
  sectionSlug,
  sectionName,
  fields,
  common,
  agents,
  errors,
  onFieldChange,
  onCommonChange,
}: Props) {
  const schema = SECTION_SCHEMAS[sectionSlug];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-purple-400/20 bg-purple-500/5 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-purple-300/70">
          {schema.recordType}
        </p>
        <p className="mt-0.5 text-sm font-medium text-white">{sectionName}</p>
        <p className="mt-1 text-[11px] text-white/40">
          Section-specific knowledge fields. Common ownership and approval apply to all records.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {schema.fields.map((field) => (
          <FieldInput
            key={field.key}
            field={field}
            value={fields[field.key] ?? ""}
            error={errors[field.key]}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ))}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-white/35">
          Ownership & Approval
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className={labelClass}>
              Owner Agent <span className="text-purple-300">*</span>
            </label>
            <select
              required
              value={common.ownerAgentId}
              onChange={(e) => {
                const agent = agents.find((a) => a.id === e.target.value);
                onCommonChange("ownerAgentId", e.target.value);
                if (agent) {
                  onCommonChange("ownerAgentName", agent.name);
                  if (!common.department) onCommonChange("department", agent.department ?? "");
                }
              }}
              className={inputClass}
            >
              <option value="">Select owner agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.role}
                </option>
              ))}
            </select>
            {errors.ownerAgentId && (
              <p className="mt-1 text-[10px] text-red-300">{errors.ownerAgentId}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Department</label>
            <input
              value={common.department}
              onChange={(e) => onCommonChange("department", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              Approved By <span className="text-purple-300">*</span>
            </label>
            <input
              required
              value={common.approvedBy}
              onChange={(e) => onCommonChange("approvedBy", e.target.value)}
              placeholder="Approver name or role"
              className={inputClass}
            />
            {errors.approvedBy && (
              <p className="mt-1 text-[10px] text-red-300">{errors.approvedBy}</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Effective Date</label>
            <input
              type="date"
              value={common.effectiveDate}
              onChange={(e) => onCommonChange("effectiveDate", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Visibility</label>
            <select
              value={common.visibility}
              onChange={(e) => onCommonChange("visibility", e.target.value)}
              className={inputClass}
            >
              <option value="all_agents">All Agents</option>
              <option value="founder_and_agents">Founder + Agents</option>
              <option value="department">Department</option>
              <option value="custodian_only">Custodian Only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
