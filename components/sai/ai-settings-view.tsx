"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDefaultEndpoint,
  getDefaultModel,
  getProviderLabel,
  listSupportedProviders,
} from "@/lib/sai/ai-provider-catalog";
import type {
  AIProvider,
  AIProviderName,
  AIModelMode,
  CompanyAISettings,
  ConnectionTestResult,
} from "@/lib/sai/types";

type Props = {
  providers: AIProvider[];
  settings: CompanyAISettings;
  isAdmin: boolean;
};

type FormState = {
  providerName: AIProviderName;
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
  defaultProvider: boolean;
};

export function AISettingsView({ providers, settings, isAdmin }: Props) {
  const router = useRouter();
  const [modelMode, setModelMode] = useState<AIModelMode>(settings.modelMode);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    providerName: "openai",
    apiKey: "",
    endpoint: getDefaultEndpoint("openai"),
    model: getDefaultModel("openai"),
    enabled: true,
    defaultProvider: false,
  });
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const supported = listSupportedProviders();

  function openCreate() {
    setEditingId(null);
    setForm({
      providerName: "openai",
      apiKey: "",
      endpoint: getDefaultEndpoint("openai"),
      model: getDefaultModel("openai"),
      enabled: true,
      defaultProvider: providers.length === 0,
    });
    setTestResult(null);
    setFormOpen(true);
  }

  function openEdit(p: AIProvider) {
    setEditingId(p.id);
    setForm({
      providerName: p.providerName,
      apiKey: p.hasApiKey ? "••••••••••••" : "",
      endpoint: p.endpoint,
      model: p.model,
      enabled: p.enabled,
      defaultProvider: p.defaultProvider,
    });
    setTestResult(null);
    setFormOpen(true);
  }

  function onProviderChange(name: AIProviderName) {
    setForm((f) => ({
      ...f,
      providerName: name,
      endpoint: getDefaultEndpoint(name),
      model: getDefaultModel(name),
    }));
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/sai/ai-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingId
            ? { providerId: editingId }
            : {
                providerName: form.providerName,
                apiKey: form.apiKey,
                endpoint: form.endpoint,
                model: form.model,
              },
        ),
      });
      const data = await res.json();
      setTestResult(data.result ?? { connected: false, error: data.error });
    } catch {
      setTestResult({ connected: false, latencyMs: 0, model: form.model, responsePreview: "", error: "Connection failed" });
    }
    setTesting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;
    setLoading(true);
    setError("");

    try {
      const url = editingId ? `/api/sai/ai-providers/${editingId}` : "/api/sai/ai-providers";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      setFormOpen(false);
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function providerAction(id: string, action: string, extra?: Record<string, unknown>) {
    setLoading(true);
    await fetch(`/api/sai/ai-providers/${id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: action === "delete" ? undefined : JSON.stringify({ action, ...extra }),
    });
    router.refresh();
    setLoading(false);
  }

  async function saveModelMode(mode: AIModelMode) {
    setModelMode(mode);
    await fetch("/api/sai/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelMode: mode }),
    });
    router.refresh();
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40";

  return (
    <div className="space-y-6">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Global Company Model</h2>
        <p className="mt-1 text-xs text-white/45">
          Choose whether all agents share one provider or use per-agent overrides.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["single", "per_agent"] as AIModelMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={!isAdmin}
              onClick={() => saveModelMode(mode)}
              className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                modelMode === mode
                  ? "border-purple-400/40 bg-purple-500/20 text-white"
                  : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              {mode === "single" ? "Single Provider For Entire Company" : "Allow Per-Agent Models"}
            </button>
          ))}
        </div>
      </section>

      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            + Add Provider
          </button>
        </div>
      )}

      {formOpen && isAdmin && (
        <form onSubmit={handleSubmit} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">
            {editingId ? "Edit Provider" : "Add AI Provider"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Provider</span>
              <select
                value={form.providerName}
                onChange={(e) => onProviderChange(e.target.value as AIProviderName)}
                className={`${inputClass} bg-[#0d0d14]`}
                disabled={Boolean(editingId)}
              >
                {supported.map((p) => (
                  <option key={p} value={p}>{getProviderLabel(p)}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">API Key</span>
              <input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                placeholder={editingId ? "Leave blank to keep existing key" : "Enter API key"}
                className={inputClass}
              />
              <p className="mt-1 text-[10px] text-white/35">Keys are encrypted at rest. Never displayed after save.</p>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Endpoint</span>
              <input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Model</span>
              <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputClass} />
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={form.defaultProvider} onChange={(e) => setForm({ ...form, defaultProvider: e.target.checked })} />
                Set as default provider
              </label>
            </div>
          </div>

          {testResult && (
            <div className={`mt-4 rounded-lg border p-3 ${testResult.connected ? "border-emerald-400/30 bg-emerald-500/10" : "border-red-400/30 bg-red-500/10"}`}>
              <p className={`text-sm font-medium ${testResult.connected ? "text-emerald-300" : "text-red-300"}`}>
                {testResult.connected ? "Connected" : "Failed"}
              </p>
              {testResult.connected ? (
                <p className="mt-1 text-xs text-white/50">
                  Latency: {testResult.latencyMs}ms · {testResult.responsePreview}
                </p>
              ) : (
                <p className="mt-1 text-xs text-red-200/80">{testResult.error}</p>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={handleTest} disabled={testing} className="rounded-lg border border-cyan-400/30 px-4 py-2 text-xs text-cyan-300 disabled:opacity-60">
              {testing ? "Testing…" : "Test Connection"}
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="enterprise-glass overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Model</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Default</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  No AI providers configured. Add one to enable agent runtime.
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-white">{getProviderLabel(p.providerName)}</p>
                    <p className="text-[10px] text-white/35">{p.hasApiKey ? "Key configured" : "No key"}</p>
                  </td>
                  <td className="px-4 py-3 text-white/70">{p.model}</td>
                  <td className="px-4 py-3">
                    <span className={p.enabled ? "text-emerald-300" : "text-white/40"}>
                      {p.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {p.defaultProvider && <span className="text-purple-300">Default</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 text-[10px]">
                        <button type="button" onClick={() => openEdit(p)} className="text-white/50 hover:text-white">Edit</button>
                        {!p.defaultProvider && (
                          <button type="button" onClick={() => providerAction(p.id, "set_default")} className="text-purple-300">Set Default</button>
                        )}
                        <button type="button" onClick={() => providerAction(p.id, "toggle", { enabled: !p.enabled })} className="text-amber-300">
                          {p.enabled ? "Disable" : "Enable"}
                        </button>
                        <button type="button" onClick={() => providerAction(p.id, "delete")} className="text-red-300">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
