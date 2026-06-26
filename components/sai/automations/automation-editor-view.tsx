"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AutomationToolsPanel } from "./automation-tools-panel";
import { AutomationTriggerPicker } from "./automation-trigger-picker";
import type {
  AgentAutomation,
  AutomationTool,
  AutomationTrigger,
  RepositoryScope,
} from "@/lib/sai/agent-automations";
import type { ToolDefinition } from "@/lib/sai/tool-permissions";

type LaunchOption = { value: string; label: string; description: string };

type Props = {
  automation: AgentAutomation;
  repos: { fullName: string }[];
  tools: ToolDefinition[];
  launchOptions: LaunchOption[];
  projects: { id: string; name: string }[];
  isAdmin: boolean;
};

export function AutomationEditorView({
  automation: initial,
  repos,
  tools,
  launchOptions,
  projects,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [automation, setAutomation] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof AgentAutomation>(key: K, value: AgentAutomation[K]) {
    setAutomation((a) => ({ ...a, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/sai/automations/${automation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: automation.name,
        description: automation.description,
        status: automation.status,
        instructions: automation.instructions,
        modelSelection: automation.modelSelection,
        memoryEnabled: automation.memoryEnabled,
        triggers: automation.triggers,
        tools: automation.tools,
        repositoryScope: automation.repositoryScope,
        preferences: automation.preferences,
        projectId: automation.projectId,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Save failed");
      return;
    }
    const data = await res.json();
    setAutomation(data.automation);
    router.refresh();
  }

  async function triggerNow() {
    await fetch("/api/sai/automations/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ automationId: automation.id }),
    });
    router.refresh();
  }

  const scope = automation.repositoryScope as RepositoryScope;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-white/45">
        <Link href="/sai/automations" className="hover:text-white/70">
          Automations
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white/70">{automation.name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={automation.status === "active"}
              disabled={!isAdmin}
              onChange={(e) =>
                patch("status", e.target.checked ? "active" : "paused")
              }
              className="rounded"
            />
            <span
              className={
                automation.status === "active" ? "text-emerald-300" : "text-white/50"
              }
            >
              {automation.status === "active" ? "Active" : "Inactive"}
            </span>
          </label>
          <select
            value={scope.repos?.[0] ?? ""}
            disabled={!isAdmin}
            onChange={(e) =>
              patch("repositoryScope", {
                ...scope,
                provider: "github",
                repos: e.target.value ? [e.target.value] : [],
              })
            }
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white"
          >
            <option value="">Select repository</option>
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
          <select
            value={automation.projectId ?? ""}
            disabled={!isAdmin}
            onChange={(e) => patch("projectId", e.target.value || null)}
            className="rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={triggerNow}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/80 hover:bg-white/5"
            >
              Run Now
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-white px-4 py-2 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}

      <input
        type="text"
        value={automation.name}
        disabled={!isAdmin}
        onChange={(e) => patch("name", e.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-lg font-semibold text-white"
      />

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Triggers</h3>
        {isAdmin ? (
          <div className="mt-3">
            <AutomationTriggerPicker
              triggers={automation.triggers as AutomationTrigger[]}
              repos={repos}
              onChange={(triggers) => patch("triggers", triggers)}
            />
          </div>
        ) : (
          <p className="mt-2 text-xs text-white/45">
            {automation.triggers.length} trigger(s) configured
          </p>
        )}
      </section>

      {automation.automationKind === "bugbot" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">BugBot Preferences</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={Boolean(automation.preferences.reviewDraftPrs)}
                disabled={!isAdmin}
                onChange={(e) =>
                  patch("preferences", {
                    ...automation.preferences,
                    reviewDraftPrs: e.target.checked,
                  })
                }
              />
              Review Draft PRs
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={automation.preferences.prSummaries !== false}
                disabled={!isAdmin}
                onChange={(e) =>
                  patch("preferences", {
                    ...automation.preferences,
                    prSummaries: e.target.checked,
                  })
                }
              />
              PR Summaries
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <input
                type="checkbox"
                checked={Boolean(automation.preferences.incrementalReview)}
                disabled={!isAdmin}
                onChange={(e) =>
                  patch("preferences", {
                    ...automation.preferences,
                    incrementalReview: e.target.checked,
                  })
                }
              />
              Incremental Review
            </label>
          </div>
        </section>
      )}

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Agent Instructions</h3>
        <textarea
          value={automation.instructions}
          disabled={!isAdmin}
          onChange={(e) => patch("instructions", e.target.value)}
          placeholder="Type @ for tools, / for commands…"
          rows={8}
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30"
        />
        <select
          value={automation.modelSelection}
          disabled={!isAdmin}
          onChange={(e) => patch("modelSelection", e.target.value)}
          className="mt-3 rounded-lg border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white"
        >
          {launchOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Tools</h3>
        <div className="mt-3">
          {isAdmin ? (
            <AutomationToolsPanel
              memoryEnabled={automation.memoryEnabled}
              tools={automation.tools as AutomationTool[]}
              registry={tools}
              onMemoryChange={(v) => patch("memoryEnabled", v)}
              onToolsChange={(t) => patch("tools", t)}
            />
          ) : (
            <p className="text-xs text-white/45">
              {automation.tools.length} tool(s) · Memory{" "}
              {automation.memoryEnabled ? "on" : "off"}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
