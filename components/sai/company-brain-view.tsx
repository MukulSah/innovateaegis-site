"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Agent } from "@/lib/sai/types";
import type { BrainLayer, BrainSection, BrainStats, MemoryRecord } from "@/lib/sai/brain/types";
import type { BrainSectionSlug } from "@/lib/sai/brain/structure.types";
import { COMPANY_BRAIN_LAYERS } from "@/lib/sai/brain/structure.types";
import {
  emptyFieldsForSection,
  getRecordDisplaySummary,
  getRecordDisplayTitle,
  SECTION_SCHEMAS,
  type SectionFields,
} from "@/lib/sai/brain/section-schemas";
import {
  SectionRecordForm,
  type SectionFormCommon,
} from "@/components/sai/brain/section-record-form";
import { SectionRecordDetail } from "@/components/sai/brain/section-record-detail";

type Props = {
  layers: BrainLayer[];
  sections: BrainSection[];
  initialRecords: MemoryRecord[];
  stats: BrainStats;
  agents: Agent[];
  isFounder: boolean;
  supabaseConfigured: boolean;
};

type FormMode = "create" | "edit";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function recordMatchesSearch(record: MemoryRecord, query: string): boolean {
  const q = query.toLowerCase();
  const fieldText = Object.values(record.sectionFields ?? {}).join(" ").toLowerCase();
  return (
    record.title.toLowerCase().includes(q) ||
    record.description.toLowerCase().includes(q) ||
    record.content.toLowerCase().includes(q) ||
    record.ownerAgentName.toLowerCase().includes(q) ||
    fieldText.includes(q)
  );
}

export function CompanyBrainView({
  layers,
  sections,
  initialRecords,
  stats,
  agents,
  isFounder,
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const [selectedLayerSlug, setSelectedLayerSlug] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [records, setRecords] = useState(initialRecords);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("create");
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formSectionId, setFormSectionId] = useState("");
  const [sectionFields, setSectionFields] = useState<SectionFields>({});
  const [common, setCommon] = useState<SectionFormCommon>({
    ownerAgentId: "",
    ownerAgentName: "",
    department: "",
    approvedBy: "",
    effectiveDate: "",
    visibility: "all_agents",
  });

  const layerSections = useMemo(() => {
    const map = new Map<string, BrainSection[]>();
    for (const section of sections) {
      const list = map.get(section.layerId) ?? [];
      list.push(section);
      map.set(section.layerId, list);
    }
    return map;
  }, [sections]);

  const selectedLayer = layers.find((l) => l.slug === selectedLayerSlug) ?? null;
  const formSection = sections.find((s) => s.id === formSectionId) ?? null;
  const formSectionSlug = (formSection?.slug ?? "") as BrainSectionSlug;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedLayer && r.layerSlug !== selectedLayer.slug && r.domainSlug !== selectedLayer.slug) {
        return false;
      }
      if (selectedSectionId && r.categoryId !== selectedSectionId) return false;
      if (search.trim() && !recordMatchesSearch(r, search)) return false;
      return true;
    });
  }, [records, selectedLayer, selectedSectionId, search]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null;

  function openCreateForm(sectionId?: string) {
    const targetSectionId = sectionId ?? selectedSectionId ?? "";
    const section = sections.find((s) => s.id === targetSectionId);
    if (!section) {
      setError("Select a knowledge section before creating a record.");
      return;
    }
    setError("");
    setFieldErrors({});
    setFormMode("create");
    setEditingRecordId(null);
    setFormSectionId(section.id);
    setSectionFields(emptyFieldsForSection(section.slug as BrainSectionSlug));
    setCommon({
      ownerAgentId: "",
      ownerAgentName: "",
      department: "",
      approvedBy: "",
      effectiveDate: "",
      visibility: "all_agents",
    });
    setFormOpen(true);
  }

  function openEditForm(record: MemoryRecord) {
    const slug = (record.sectionSlug ?? "") as BrainSectionSlug;
    if (!slug || !SECTION_SCHEMAS[slug]) {
      setError("This record cannot be edited with a section form.");
      return;
    }
    setError("");
    setFieldErrors({});
    setFormMode("edit");
    setEditingRecordId(record.id);
    setFormSectionId(record.categoryId ?? "");
    setSectionFields({ ...emptyFieldsForSection(slug), ...record.sectionFields });
    setCommon({
      ownerAgentId: record.ownerAgentId ?? "",
      ownerAgentName: record.ownerAgentName,
      department: record.department,
      approvedBy: record.approvedBy,
      effectiveDate: record.effectiveDate?.slice(0, 10) ?? "",
      visibility: record.visibility,
    });
    setFormOpen(true);
  }

  function handleCommonChange(key: keyof SectionFormCommon, value: string) {
    setCommon((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isFounder || !formSection) return;

    setLoading(true);
    setError("");
    setFieldErrors({});

    const agent = agents.find((a) => a.id === common.ownerAgentId);
    const payload = {
      domainId: formSection.layerId,
      categoryId: formSection.id,
      sectionSlug: formSection.slug,
      sectionFields,
      ownerAgentId: common.ownerAgentId || null,
      ownerAgentName: agent?.name ?? common.ownerAgentName,
      department: common.department || agent?.department || "",
      approvedBy: common.approvedBy,
      effectiveDate: common.effectiveDate || null,
      visibility: common.visibility,
    };

    try {
      const url =
        formMode === "edit" && editingRecordId
          ? `/api/sai/brain/records/${editingRecordId}`
          : "/api/sai/brain/records";
      const res = await fetch(url, {
        method: formMode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.errors)) {
          const map: Record<string, string> = {};
          for (const err of data.errors as { field: string; message: string }[]) {
            map[err.field] = err.message;
          }
          setFieldErrors(map);
        }
        throw new Error(data.error ?? "Failed to save record");
      }

      if (formMode === "edit") {
        setRecords((prev) => prev.map((r) => (r.id === data.record.id ? data.record : r)));
        setSelectedRecordId(data.record.id);
      } else {
        setRecords((prev) => [data.record, ...prev]);
        setSelectedRecordId(data.record.id);
      }

      setFormOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Connect Supabase to activate Company Brain.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] gap-0 overflow-hidden rounded-2xl border border-purple-400/15 bg-[#06061a]/80">
      <aside className="w-60 shrink-0 border-r border-white/10 bg-[#050510]/90 p-4">
        <div className="mb-3 rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/80">
            Structure Locked
          </p>
          <p className="mt-1 text-[10px] text-white/40">4 layers · 15 sections</p>
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Company Brain
        </p>

        <button
          type="button"
          onClick={() => {
            setSelectedLayerSlug(null);
            setSelectedSectionId(null);
          }}
          className={`mb-2 w-full rounded-lg px-3 py-2 text-left text-xs ${
            !selectedLayerSlug ? "bg-purple-500/15 text-white" : "text-white/50 hover:text-white"
          }`}
        >
          All Knowledge ({stats.activeRecords})
        </button>

        {COMPANY_BRAIN_LAYERS.map((layerDef) => {
          const layer = layers.find((l) => l.slug === layerDef.slug);
          const layerId = layer?.id;
          const sectionList = layerId ? layerSections.get(layerId) ?? [] : [];
          const isOpen = selectedLayerSlug === layerDef.slug;

          return (
            <div key={layerDef.slug} className="mb-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedLayerSlug(layerDef.slug);
                  setSelectedSectionId(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium ${
                  isOpen ? "bg-purple-500/15 text-white" : "text-white/55 hover:bg-white/5"
                }`}
              >
                <span className="mr-1.5 text-purple-300/70">{layerDef.icon}</span>
                {layerDef.name.replace(" Layer", "")}
                <span className="ml-1 text-white/25">({layer?.recordCount ?? 0})</span>
              </button>
              {isOpen && (
                <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                  {sectionList.map((section) => (
                    <li key={section.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedLayerSlug(layerDef.slug);
                          setSelectedSectionId(section.id);
                        }}
                        className={`w-full rounded px-2 py-1.5 text-left text-[11px] ${
                          selectedSectionId === section.id
                            ? "bg-white/10 text-white"
                            : "text-white/45 hover:text-white/70"
                        }`}
                      >
                        {section.name}
                        <span className="ml-1 text-white/25">({section.recordCount ?? 0})</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-3 text-center">
          <div>
            <p className="text-lg font-bold text-white">{stats.activeRecords}</p>
            <p className="text-[10px] text-white/35">Records</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">{stats.totalRelationships}</p>
            <p className="text-[10px] text-white/35">Links</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">4</p>
            <p className="text-[10px] text-white/35">Layers</p>
          </div>
          <div>
            <p className="text-lg font-bold text-white">15</p>
            <p className="text-[10px] text-white/35">Sections</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search approved company knowledge…"
            className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
          {isFounder && (
            <button
              type="button"
              onClick={() => openCreateForm()}
              disabled={!selectedSectionId}
              title={!selectedSectionId ? "Select a section first" : undefined}
              className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Section Record
            </button>
          )}
        </div>

        {error && !formOpen && (
          <p className="mx-5 mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-1 overflow-hidden">
          <div className="w-80 shrink-0 overflow-y-auto border-r border-white/10 p-4">
            <ul className="space-y-2">
              {filteredRecords.length === 0 && (
                <li className="text-sm text-white/40">
                  {selectedSectionId
                    ? "No records in this section yet. Create one with the section form."
                    : "No approved knowledge here. Select a section to add records."}
                </li>
              )}
              {filteredRecords.map((record) => (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRecordId(record.id)}
                    className={`w-full rounded-xl border p-3 text-left ${
                      selectedRecordId === record.id
                        ? "border-purple-400/40 bg-purple-500/10"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20"
                    }`}
                  >
                    <p className="text-sm font-medium text-white">
                      {getRecordDisplayTitle(record)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-white/45">
                      {getRecordDisplaySummary(record)}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {record.recordType && (
                        <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200">
                          {record.recordType}
                        </span>
                      )}
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                        {record.categoryName}
                      </span>
                      {record.ownerAgentName && (
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                          {record.ownerAgentName}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex-1 overflow-y-auto p-5">
            {selectedRecord ? (
              <div className="space-y-4">
                <SectionRecordDetail record={selectedRecord} />
                {isFounder && selectedRecord.sectionSlug && (
                  <button
                    type="button"
                    onClick={() => openEditForm(selectedRecord)}
                    className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
                  >
                    Edit {SECTION_SCHEMAS[selectedRecord.sectionSlug as BrainSectionSlug]?.title}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-4xl text-purple-400/30">▣</p>
                <p className="mt-3 text-sm text-white/45">Constitutional knowledge system</p>
                <p className="mt-1 max-w-md text-xs text-white/30">
                  Select a layer and section, then create section-specific knowledge.
                  Each of the 15 sections has its own schema — not a generic note form.
                </p>
                {selectedSectionId && isFounder && (
                  <button
                    type="button"
                    onClick={() => openCreateForm(selectedSectionId)}
                    className="mt-4 rounded-lg bg-purple-600/80 px-4 py-2 text-xs text-white"
                  >
                    Create in{" "}
                    {sections.find((s) => s.id === selectedSectionId)?.name}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {formOpen && isFounder && formSection && formSectionSlug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleSubmit}
            className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-purple-400/20 bg-[#0a0a24]"
          >
            <div className="border-b border-white/10 px-6 py-4">
              <h3 className="text-lg font-semibold text-white">
                {formMode === "edit" ? "Edit" : "New"}{" "}
                {SECTION_SCHEMAS[formSectionSlug].title}
              </h3>
              <p className="mt-1 text-xs text-white/40">
                {formMode === "edit" ? "Update" : "Add"} approved organizational knowledge
              </p>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && (
                <p className="mb-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {error}
                </p>
              )}
              <SectionRecordForm
                sectionSlug={formSectionSlug}
                sectionName={formSection.name}
                fields={sectionFields}
                common={common}
                agents={agents}
                errors={fieldErrors}
                onFieldChange={(key, value) =>
                  setSectionFields((prev) => ({ ...prev, [key]: value }))
                }
                onCommonChange={handleCommonChange}
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="text-xs text-white/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs text-white disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save to Company Brain"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
