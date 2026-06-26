"use client";

import Link from "next/link";
import { useState } from "react";
import type { BugbotDefaults, CompanyAutomationSettings } from "@/lib/sai/automation-settings";
import type { IntegrationAccount } from "@/lib/sai/types";

type Props = {
  settings: CompanyAutomationSettings;
  accounts: IntegrationAccount[];
  isAdmin: boolean;
};

export function BugbotSettingsPanel({ settings: initial, accounts, isAdmin }: Props) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);

  const githubAccounts = accounts.filter((a) => a.provider === "github");

  async function save(patch: Partial<{
    bugbotEnabled: boolean;
    bugbotDefaults: Partial<BugbotDefaults>;
  }>) {
    setSaving(true);
    const res = await fetch("/api/sai/automations/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
    }
  }

  const defaults = settings.bugbotDefaults;

  return (
    <div className="space-y-6">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">BugBot</h3>
        <p className="mt-1 text-xs text-white/45">
          BugBot reviews are billed through your AI provider usage.
        </p>
        <label className="mt-4 flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            checked={settings.bugbotEnabled}
            disabled={!isAdmin}
            onChange={(e) => {
              setSettings((s) => ({ ...s, bugbotEnabled: e.target.checked }));
              save({ bugbotEnabled: e.target.checked });
            }}
          />
          Enable BugBot
        </label>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Preferences</h3>
        <div className="mt-4 space-y-3">
          <div>
            <p className="text-xs text-white/60">Trigger Mode</p>
            <select
              disabled={!isAdmin}
              value={defaults.triggerMode}
              onChange={(e) => {
                const triggerMode = e.target.value as BugbotDefaults["triggerMode"];
                setSettings((s) => ({
                  ...s,
                  bugbotDefaults: { ...s.bugbotDefaults, triggerMode },
                }));
                save({ bugbotDefaults: { triggerMode } });
              }}
              className="mt-1 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white"
            >
              <option value="every_push">Every Push</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={defaults.reviewDraftPrs}
              disabled={!isAdmin}
              onChange={(e) => save({ bugbotDefaults: { reviewDraftPrs: e.target.checked } })}
            />
            Review Draft PRs
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={defaults.prSummaries}
              disabled={!isAdmin}
              onChange={(e) => save({ bugbotDefaults: { prSummaries: e.target.checked } })}
            />
            PR Summaries
          </label>
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input
              type="checkbox"
              checked={defaults.incrementalReview}
              disabled={!isAdmin}
              onChange={(e) => save({ bugbotDefaults: { incrementalReview: e.target.checked } })}
            />
            Incremental Review
          </label>
        </div>
        {saving && <p className="mt-2 text-[10px] text-white/40">Saving…</p>}
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Integrations</h3>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
            <div>
              <p className="text-xs font-medium text-white">GitHub Connections</p>
              <p className="text-[10px] text-white/45">
                {githubAccounts.length} connected account(s)
              </p>
            </div>
            <Link
              href="/sai/settings?tab=resources"
              className="text-[10px] text-purple-300 hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 opacity-60">
            <div>
              <p className="text-xs font-medium text-white">GitLab Connections</p>
              <p className="text-[10px] text-white/45">0 Repositories Available</p>
            </div>
            <span className="text-[10px] text-white/35">Coming soon</span>
          </div>
        </div>
      </section>
    </div>
  );
}
