"use client";

import { CRON_PRESETS } from "@/lib/sai/cron-scheduler";
import type { AutomationTrigger } from "@/lib/sai/agent-automations";

type Props = {
  triggers: AutomationTrigger[];
  repos: { fullName: string }[];
  onChange: (triggers: AutomationTrigger[]) => void;
};

const SCHEDULE_PRESETS = [
  { id: "hourly", label: "Hourly", cron: CRON_PRESETS.hourly },
  { id: "daily", label: "Daily", cron: CRON_PRESETS.daily },
  { id: "weekly", label: "Weekly", cron: CRON_PRESETS.weekly },
] as const;

const GIT_EVENTS = [
  { id: "pr_pushed", label: "Every Push" },
  { id: "pr_opened", label: "Pull Request Opened" },
  { id: "pr_merged", label: "Pull Request Merged" },
] as const;

export function AutomationTriggerPicker({ triggers, repos, onChange }: Props) {
  const cronTrigger = triggers.find((t) => t.type === "cron");
  const gitTrigger = triggers.find((t) => t.type === "git");

  function setCron(preset: string, cron: string) {
    const rest = triggers.filter((t) => t.type !== "cron");
    onChange([...rest, { type: "cron", cron, preset, timezone: "UTC" }]);
  }

  function setGit(event: "pr_opened" | "pr_pushed" | "pr_merged", selectedRepos: string[]) {
    const rest = triggers.filter((t) => t.type !== "git");
    onChange([...rest, { type: "git", event, repos: selectedRepos }]);
  }

  function removeTrigger(type: "cron" | "git") {
    onChange(triggers.filter((t) => t.type !== type));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <details className="group">
            <summary className="cursor-pointer list-none rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">
              + Add Trigger
            </summary>
            <div className="absolute left-0 z-20 mt-1 min-w-[200px] rounded-lg border border-white/10 bg-[#12121a] p-2 shadow-xl">
              <p className="px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">Scheduled</p>
              {SCHEDULE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setCron(p.id, p.cron)}
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/5"
                >
                  {p.label}
                </button>
              ))}
              <p className="mt-2 px-2 py-1 text-[10px] uppercase tracking-wider text-white/40">GitHub / GitLab</p>
              {GIT_EVENTS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() =>
                    setGit(e.id, gitTrigger?.type === "git" ? gitTrigger.repos : [])
                  }
                  className="block w-full rounded px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/5"
                >
                  {e.label}
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      {cronTrigger?.type === "cron" && (
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <div>
            <p className="text-xs font-medium text-white">Scheduled</p>
            <p className="text-[10px] text-white/45">
              {cronTrigger.preset ?? "custom"} · {cronTrigger.cron}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeTrigger("cron")}
            className="text-[10px] text-red-300/80 hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {gitTrigger?.type === "git" && (
        <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-white">GitHub — {gitTrigger.event}</p>
              <p className="text-[10px] text-white/45">Triggers on repository events</p>
            </div>
            <button
              type="button"
              onClick={() => removeTrigger("git")}
              className="text-[10px] text-red-300/80 hover:underline"
            >
              Remove
            </button>
          </div>
          <select
            multiple
            value={gitTrigger.repos}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
              setGit(gitTrigger.event, selected);
            }}
            className="mt-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
            size={Math.min(4, Math.max(2, repos.length))}
          >
            {repos.map((r) => (
              <option key={r.fullName} value={r.fullName}>
                {r.fullName}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-white/35">Hold Ctrl/Cmd to select multiple repos</p>
        </div>
      )}

      {triggers.length === 0 && (
        <p className="text-xs text-white/40">No triggers configured. Add a schedule or GitHub event.</p>
      )}
    </div>
  );
}
