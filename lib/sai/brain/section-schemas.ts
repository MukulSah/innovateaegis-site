import type { BrainSectionSlug } from "./structure.types";

export type SectionRecordType =
  | "MissionVisionRecord"
  | "PolicyRecord"
  | "ObjectiveRecord"
  | "OrganizationStructureRecord"
  | "SOPRecord"
  | "DecisionRecord"
  | "KnowledgeRecord"
  | "WorkflowRecord"
  | "AnalyticsRecord"
  | "RiskRecord"
  | "InnovationRecord"
  | "LearningRecord"
  | "CommunicationRecord"
  | "PartnershipRecord"
  | "CustomerKnowledgeRecord";

export type SectionFieldType =
  | "text"
  | "textarea"
  | "date"
  | "select"
  | "tags"
  | "number";

export type SectionFieldSchema = {
  key: string;
  label: string;
  type: SectionFieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  rows?: number;
  colSpan?: 1 | 2;
};

export type SectionSchema = {
  recordType: SectionRecordType;
  sectionSlug: BrainSectionSlug;
  title: string;
  primaryField: string;
  summaryField?: string;
  fields: SectionFieldSchema[];
};

export type SectionFields = Record<string, string>;

export type SectionRecordMetadata = {
  recordType: SectionRecordType;
  fields: SectionFields;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "review", label: "Under Review" },
  { value: "archived", label: "Archived" },
];

const PRIORITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const SEVERITY_OPTIONS = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const LIKELIHOOD_OPTIONS = [
  { value: "certain", label: "Certain" },
  { value: "likely", label: "Likely" },
  { value: "possible", label: "Possible" },
  { value: "unlikely", label: "Unlikely" },
];

const TREND_OPTIONS = [
  { value: "up", label: "Improving" },
  { value: "stable", label: "Stable" },
  { value: "down", label: "Declining" },
];

export const SECTION_SCHEMAS: Record<BrainSectionSlug, SectionSchema> = {
  "mission-vision": {
    recordType: "MissionVisionRecord",
    sectionSlug: "mission-vision",
    title: "Mission & Vision",
    primaryField: "mission",
    summaryField: "vision",
    fields: [
      { key: "mission", label: "Mission", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "vision", label: "Vision", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "strategicPurpose", label: "Strategic Purpose", type: "textarea", rows: 2, colSpan: 2 },
      { key: "longTermDirection", label: "Long-Term Direction", type: "textarea", rows: 2, colSpan: 2 },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "effectiveDate", label: "Effective Date", type: "date" },
      { key: "reviewDate", label: "Review Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
  "values-policies": {
    recordType: "PolicyRecord",
    sectionSlug: "values-policies",
    title: "Values & Policies",
    primaryField: "policyName",
    summaryField: "description",
    fields: [
      { key: "policyName", label: "Policy Name", type: "text", required: true, colSpan: 2 },
      { key: "policyCategory", label: "Policy Category", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "businessImpact", label: "Business Impact", type: "textarea", rows: 2, colSpan: 2 },
      { key: "enforcementOwner", label: "Enforcement Owner", type: "text" },
      { key: "reviewCycle", label: "Review Cycle", type: "text", placeholder: "e.g. Quarterly" },
    ],
  },
  "objectives-goals": {
    recordType: "ObjectiveRecord",
    sectionSlug: "objectives-goals",
    title: "Objectives & Goals",
    primaryField: "objective",
    summaryField: "goal",
    fields: [
      { key: "objective", label: "Objective", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "goal", label: "Goal", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "department", label: "Department", type: "text", required: true },
      { key: "priority", label: "Priority", type: "select", options: PRIORITY_OPTIONS },
      { key: "targetKpi", label: "Target KPI", type: "text" },
      { key: "targetValue", label: "Target Value", type: "text" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "endDate", label: "End Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "dependencies", label: "Dependencies", type: "tags", colSpan: 2 },
      { key: "relatedProjects", label: "Related Projects", type: "tags", colSpan: 2 },
    ],
  },
  "company-structure": {
    recordType: "OrganizationStructureRecord",
    sectionSlug: "company-structure",
    title: "Company Structure",
    primaryField: "designation",
    summaryField: "department",
    fields: [
      { key: "department", label: "Department", type: "text", required: true },
      { key: "designation", label: "Designation", type: "text", required: true },
      { key: "authorityLevel", label: "Authority Level", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "responsibilities", label: "Responsibilities", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "reportsTo", label: "Reports To", type: "text" },
      { key: "subordinates", label: "Subordinates", type: "tags" },
      { key: "relatedAgents", label: "Related Agents", type: "tags", colSpan: 2 },
      { key: "notes", label: "Notes", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
  sops: {
    recordType: "SOPRecord",
    sectionSlug: "sops",
    title: "SOPs",
    primaryField: "sopTitle",
    summaryField: "purpose",
    fields: [
      { key: "sopTitle", label: "SOP Title", type: "text", required: true, colSpan: 2 },
      { key: "category", label: "Category", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "purpose", label: "Purpose", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "procedureSteps", label: "Procedure Steps", type: "textarea", required: true, rows: 5, colSpan: 2 },
      { key: "owner", label: "Owner", type: "text", required: true },
      { key: "validator", label: "Validator", type: "text" },
      { key: "reviewDate", label: "Review Date", type: "date" },
    ],
  },
  "company-decisions": {
    recordType: "DecisionRecord",
    sectionSlug: "company-decisions",
    title: "Company Decisions",
    primaryField: "decisionTitle",
    summaryField: "decisionSummary",
    fields: [
      { key: "decisionTitle", label: "Decision Title", type: "text", required: true, colSpan: 2 },
      { key: "decisionSummary", label: "Decision Summary", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "reason", label: "Reason", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "alternativesConsidered", label: "Alternatives Considered", type: "textarea", rows: 2, colSpan: 2 },
      { key: "expectedImpact", label: "Expected Impact", type: "textarea", rows: 2, colSpan: 2 },
      { key: "decisionDate", label: "Decision Date", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "relatedProjects", label: "Related Projects", type: "tags", colSpan: 2 },
      { key: "relatedMeetings", label: "Related Meetings", type: "tags", colSpan: 2 },
    ],
  },
  "company-knowledge": {
    recordType: "KnowledgeRecord",
    sectionSlug: "company-knowledge",
    title: "Company Knowledge",
    primaryField: "knowledgeTitle",
    summaryField: "summary",
    fields: [
      { key: "knowledgeTitle", label: "Knowledge Title", type: "text", required: true, colSpan: 2 },
      { key: "knowledgeType", label: "Knowledge Type", type: "text", required: true },
      { key: "source", label: "Source", type: "text" },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "detailedKnowledge", label: "Detailed Knowledge", type: "textarea", required: true, rows: 5, colSpan: 2 },
      { key: "owner", label: "Owner", type: "text" },
      { key: "tags", label: "Tags", type: "tags", colSpan: 2 },
      { key: "relatedAreas", label: "Related Areas", type: "tags", colSpan: 2 },
    ],
  },
  "workflows-processes": {
    recordType: "WorkflowRecord",
    sectionSlug: "workflows-processes",
    title: "Workflows & Processes",
    primaryField: "workflowName",
    summaryField: "purpose",
    fields: [
      { key: "workflowName", label: "Workflow Name", type: "text", required: true, colSpan: 2 },
      { key: "purpose", label: "Purpose", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "trigger", label: "Trigger", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "inputs", label: "Inputs", type: "textarea", rows: 2, colSpan: 2 },
      { key: "processSteps", label: "Process Steps", type: "textarea", required: true, rows: 5, colSpan: 2 },
      { key: "responsibleAgents", label: "Responsible Agents", type: "tags", colSpan: 2 },
      { key: "outputs", label: "Outputs", type: "textarea", rows: 2, colSpan: 2 },
      { key: "successCriteria", label: "Success Criteria", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
  "data-analytics": {
    recordType: "AnalyticsRecord",
    sectionSlug: "data-analytics",
    title: "Data & Analytics",
    primaryField: "metricName",
    summaryField: "notes",
    fields: [
      { key: "metricName", label: "Metric Name", type: "text", required: true, colSpan: 2 },
      { key: "metricCategory", label: "Metric Category", type: "text", required: true },
      { key: "source", label: "Source", type: "text" },
      { key: "currentValue", label: "Current Value", type: "text" },
      { key: "targetValue", label: "Target Value", type: "text" },
      { key: "trend", label: "Trend", type: "select", options: TREND_OPTIONS },
      { key: "reviewFrequency", label: "Review Frequency", type: "text", placeholder: "e.g. Weekly" },
      { key: "notes", label: "Notes", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
  "risk-compliance": {
    recordType: "RiskRecord",
    sectionSlug: "risk-compliance",
    title: "Risk & Compliance",
    primaryField: "riskName",
    summaryField: "mitigationPlan",
    fields: [
      { key: "riskName", label: "Risk Name", type: "text", required: true, colSpan: 2 },
      { key: "category", label: "Category", type: "text", required: true },
      { key: "severity", label: "Severity", type: "select", options: SEVERITY_OPTIONS },
      { key: "likelihood", label: "Likelihood", type: "select", options: LIKELIHOOD_OPTIONS },
      { key: "impact", label: "Impact", type: "textarea", rows: 2, colSpan: 2 },
      { key: "mitigationPlan", label: "Mitigation Plan", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "reviewDate", label: "Review Date", type: "date" },
      { key: "relatedSystems", label: "Related Systems", type: "tags", colSpan: 2 },
    ],
  },
  "innovation-sandbox": {
    recordType: "InnovationRecord",
    sectionSlug: "innovation-sandbox",
    title: "Innovation Sandbox",
    primaryField: "experimentName",
    summaryField: "hypothesis",
    fields: [
      { key: "experimentName", label: "Experiment Name", type: "text", required: true, colSpan: 2 },
      { key: "hypothesis", label: "Hypothesis", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "expectedOutcome", label: "Expected Outcome", type: "textarea", rows: 2, colSpan: 2 },
      { key: "result", label: "Result", type: "textarea", rows: 2, colSpan: 2 },
      { key: "decision", label: "Decision", type: "text" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "date", label: "Date", type: "date" },
    ],
  },
  "learning-feedback": {
    recordType: "LearningRecord",
    sectionSlug: "learning-feedback",
    title: "Learning & Feedback",
    primaryField: "lessonTitle",
    summaryField: "learning",
    fields: [
      { key: "lessonTitle", label: "Lesson Title", type: "text", required: true, colSpan: 2 },
      { key: "source", label: "Source", type: "text", required: true },
      { key: "date", label: "Date", type: "date" },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "problem", label: "Problem", type: "textarea", rows: 2, colSpan: 2 },
      { key: "outcome", label: "Outcome", type: "textarea", rows: 2, colSpan: 2 },
      { key: "learning", label: "Learning", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "recommendation", label: "Recommendation", type: "textarea", rows: 2, colSpan: 2 },
      { key: "relatedProject", label: "Related Project", type: "text" },
    ],
  },
  "communication-framework": {
    recordType: "CommunicationRecord",
    sectionSlug: "communication-framework",
    title: "Communication Framework",
    primaryField: "communicationType",
    summaryField: "guidelines",
    fields: [
      { key: "communicationType", label: "Communication Type", type: "text", required: true },
      { key: "audience", label: "Audience", type: "text", required: true },
      { key: "channel", label: "Channel", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "purpose", label: "Purpose", type: "textarea", rows: 2, colSpan: 2 },
      { key: "guidelines", label: "Guidelines", type: "textarea", required: true, rows: 4, colSpan: 2 },
    ],
  },
  "partnerships-ecosystem": {
    recordType: "PartnershipRecord",
    sectionSlug: "partnerships-ecosystem",
    title: "Partnerships & Ecosystem",
    primaryField: "partnerName",
    summaryField: "description",
    fields: [
      { key: "partnerName", label: "Partner Name", type: "text", required: true, colSpan: 2 },
      { key: "partnerCategory", label: "Partner Category", type: "text", required: true },
      { key: "relationshipType", label: "Relationship Type", type: "text", required: true },
      { key: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { key: "description", label: "Description", type: "textarea", required: true, rows: 3, colSpan: 2 },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "reviewDate", label: "Review Date", type: "date" },
      { key: "notes", label: "Notes", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
  "customer-knowledge-base": {
    recordType: "CustomerKnowledgeRecord",
    sectionSlug: "customer-knowledge-base",
    title: "Customer Knowledge Base",
    primaryField: "customerSegment",
    summaryField: "customerNeed",
    fields: [
      { key: "customerSegment", label: "Customer Segment", type: "text", required: true, colSpan: 2 },
      { key: "customerNeed", label: "Customer Need", type: "textarea", required: true, rows: 2, colSpan: 2 },
      { key: "painPoint", label: "Pain Point", type: "textarea", rows: 2, colSpan: 2 },
      { key: "feedback", label: "Feedback", type: "textarea", rows: 2, colSpan: 2 },
      { key: "featureRequests", label: "Feature Requests", type: "tags", colSpan: 2 },
      { key: "supportHistory", label: "Support History", type: "textarea", rows: 2, colSpan: 2 },
      { key: "relationshipStatus", label: "Relationship Status", type: "select", options: STATUS_OPTIONS },
      { key: "notes", label: "Notes", type: "textarea", rows: 2, colSpan: 2 },
    ],
  },
};

export function getSchemaForSection(slug: BrainSectionSlug): SectionSchema {
  return SECTION_SCHEMAS[slug];
}

export function getSchemaByRecordType(recordType: SectionRecordType): SectionSchema | undefined {
  return Object.values(SECTION_SCHEMAS).find((s) => s.recordType === recordType);
}

export function emptyFieldsForSection(slug: BrainSectionSlug): SectionFields {
  const schema = SECTION_SCHEMAS[slug];
  const fields: SectionFields = {};
  for (const field of schema.fields) {
    fields[field.key] = "";
  }
  return fields;
}

export type SectionRecordValidationError = { field: string; message: string };

export function validateSectionFields(
  slug: BrainSectionSlug,
  fields: SectionFields,
): SectionRecordValidationError[] {
  const schema = SECTION_SCHEMAS[slug];
  const errors: SectionRecordValidationError[] = [];

  for (const field of schema.fields) {
    const value = (fields[field.key] ?? "").trim();
    if (field.required && !value) {
      errors.push({ field: field.key, message: `${field.label} is required` });
    }
  }

  return errors;
}

export function buildSearchableContent(slug: BrainSectionSlug, fields: SectionFields): string {
  const schema = SECTION_SCHEMAS[slug];
  return schema.fields
    .map((f) => {
      const value = fields[f.key]?.trim();
      if (!value) return "";
      return `${f.label}: ${value}`;
    })
    .filter(Boolean)
    .join("\n\n");
}

export function buildRecordPresentation(
  slug: BrainSectionSlug,
  fields: SectionFields,
): { title: string; description: string; content: string; metadata: SectionRecordMetadata } {
  const schema = SECTION_SCHEMAS[slug];
  const primary = fields[schema.primaryField]?.trim() || schema.title;
  const summaryKey = schema.summaryField ?? schema.primaryField;
  const description = fields[summaryKey]?.trim() || primary;

  return {
    title: primary.length > 120 ? `${primary.slice(0, 117)}…` : primary,
    description: description.length > 240 ? `${description.slice(0, 237)}…` : description,
    content: buildSearchableContent(slug, fields),
    metadata: {
      recordType: schema.recordType,
      fields,
    },
  };
}

export function parseSectionMetadata(raw: unknown): SectionRecordMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.recordType !== "string" || !obj.fields || typeof obj.fields !== "object") {
    return null;
  }
  const fields: SectionFields = {};
  for (const [key, value] of Object.entries(obj.fields as Record<string, unknown>)) {
    fields[key] = typeof value === "string" ? value : String(value ?? "");
  }
  return {
    recordType: obj.recordType as SectionRecordType,
    fields,
  };
}

export function getRecordDisplayTitle(
  record: { title: string; sectionSlug?: string | null; metadata?: SectionRecordMetadata | null },
): string {
  if (record.metadata?.fields) {
    const schema = record.sectionSlug
      ? SECTION_SCHEMAS[record.sectionSlug as BrainSectionSlug]
      : getSchemaByRecordType(record.metadata.recordType);
    if (schema) {
      const primary = record.metadata.fields[schema.primaryField]?.trim();
      if (primary) return primary.length > 120 ? `${primary.slice(0, 117)}…` : primary;
    }
  }
  return record.title;
}

export function getRecordDisplaySummary(
  record: { description: string; sectionSlug?: string | null; metadata?: SectionRecordMetadata | null },
): string {
  if (record.metadata?.fields) {
    const schema = record.sectionSlug
      ? SECTION_SCHEMAS[record.sectionSlug as BrainSectionSlug]
      : getSchemaByRecordType(record.metadata.recordType);
    if (schema) {
      const key = schema.summaryField ?? schema.primaryField;
      const summary = record.metadata.fields[key]?.trim();
      if (summary) return summary.length > 200 ? `${summary.slice(0, 197)}…` : summary;
    }
  }
  return record.description;
}

export function extractTagsFromSectionFields(slug: BrainSectionSlug, fields: SectionFields): string[] {
  const tags: string[] = [];
  for (const field of SECTION_SCHEMAS[slug].fields) {
    if (field.type === "tags" && fields[field.key]?.trim()) {
      tags.push(
        ...fields[field.key]
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      );
    }
  }
  if (slug === "company-knowledge" && fields.tags?.trim()) {
    tags.push(
      ...fields.tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  return [...new Set(tags)];
}
