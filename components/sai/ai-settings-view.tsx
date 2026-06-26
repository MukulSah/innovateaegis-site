"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getDefaultEndpoint,
  getDefaultModel,
  getProviderLabel,
  listSupportedProviders,
} from "@/lib/sai/ai-provider-catalog";
import { supportsModelCatalog } from "@/lib/sai/ai-model-catalog";
import type {
  AIProvider,
  AIProviderName,
  AIModelMode,
  AIExecutionMode,
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
  modelPool: string[];
  autoRotateModels: boolean;
  enabled: boolean;
  defaultProvider: boolean;
};

type CatalogModel = { id: string; name: string; ownedBy?: string };

export function AISettingsView({ providers, settings, isAdmin }: Props) {
  const router = useRouter();
  const [modelMode, setModelMode] = useState<AIModelMode>(settings.modelMode);
  const [executionMode, setExecutionMode] = useState<AIExecutionMode>(settings.executionMode ?? "free");
  const [autoModelRotation, setAutoModelRotation] = useState(settings.autoModelRotation ?? true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [catalogModels, setCatalogModels] = useState<CatalogModel[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [form, setForm] = useState<FormState>({
    providerName: "openai",
    apiKey: "",
    endpoint: getDefaultEndpoint("openai"),
    model: getDefaultModel("openai"),
    modelPool: [],
    autoRotateModels: false,
    enabled: true,
    defaultProvider: false,
  });
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingKeyReadable, setEditingKeyReadable] = useState(false);

  const supported = listSupportedProviders();

  function openCreate() {
    setEditingId(null);
    setEditingKeyReadable(false);
    setForm({
      providerName: "openai",
      apiKey: "",
      endpoint: getDefaultEndpoint("openai"),
      model: getDefaultModel("openai"),
      modelPool: [],
      autoRotateModels: false,
      enabled: true,
      defaultProvider: providers.length === 0,
    });
    setCatalogModels([]);
    setCatalogError("");
    setEditingKeyReadable(false);
    setTestResult(null);
    setFormOpen(true);
  }

  function openEdit(p: AIProvider) {
    setEditingId(p.id);
    setEditingKeyReadable(p.keyReadable);
    setForm({
      providerName: p.providerName,
      apiKey: "",
      endpoint: p.endpoint || getDefaultEndpoint(p.providerName),
      model: p.model,
      modelPool: p.modelPool ?? [],
      autoRotateModels: p.autoRotateModels ?? false,
      enabled: p.enabled,
      defaultProvider: p.defaultProvider,
    });
    setCatalogModels([]);
    setCatalogError("");
    setTestResult(null);
    setFormOpen(true);
  }

  function onProviderChange(name: AIProviderName) {
    setForm((f) => ({
      ...f,
      providerName: name,
      endpoint: getDefaultEndpoint(name),
      model: getDefaultModel(name),
      modelPool: [],
      autoRotateModels: false,
    }));
    setCatalogModels([]);
    setCatalogError("");
  }

  async function loadCatalogModels() {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const res = await fetch("/api/sai/ai-providers/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { providerId: editingId } : {}),
          providerName: form.providerName,
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
          endpoint: form.endpoint,
          model: form.model,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load models");
      const models = (data.models ?? []) as CatalogModel[];
      setCatalogModels(models);
      if (models.length === 0) {
        setCatalogError("No models returned from catalog.");
      } else if (!form.model && models[0]) {
        setForm((f) => ({ ...f, model: models[0].id }));
      }
    } catch (err) {
      setCatalogError(err instanceof Error ? err.message : "Failed to load catalog");
      setCatalogModels([]);
    } finally {
      setCatalogLoading(false);
    }
  }

  function togglePoolModel(modelId: string) {
    setForm((f) => {
      const pool = new Set(f.modelPool);
      if (pool.has(modelId)) pool.delete(modelId);
      else pool.add(modelId);
      return { ...f, modelPool: Array.from(pool) };
    });
  }

  function useAllCatalogForRotation() {
    const ids = catalogModels.map((m) => m.id).filter((id) => id !== form.model);
    setForm((f) => ({ ...f, modelPool: ids, autoRotateModels: true }));
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    setError("");

    if (!form.apiKey.trim() && !(editingId && editingKeyReadable)) {
      setTestResult({
        connected: false,
        latencyMs: 0,
        model: form.model,
        responsePreview: "",
        error: "Paste your API key, or save a readable key first.",
      });
      setTesting(false);
      return;
    }

    try {
      const res = await fetch("/api/sai/ai-providers/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { providerId: editingId } : {}),
          providerName: form.providerName,
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
          endpoint: form.endpoint,
          model: form.model,
        }),
      });

      let data: { result?: ConnectionTestResult; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setTestResult({
          connected: false,
          latencyMs: 0,
          model: form.model,
          responsePreview: "",
          error: `Server returned an invalid response (${res.status}). Restart the dev server and try again.`,
        });
        return;
      }

      if (!res.ok) {
        setTestResult({
          connected: false,
          latencyMs: 0,
          model: form.model,
          responsePreview: "",
          error: data.error ?? `Test request failed (${res.status})`,
        });
        return;
      }

      setTestResult(
        data.result ?? {
          connected: false,
          latencyMs: 0,
          model: form.model,
          responsePreview: "",
          error: "No test result returned from server.",
        },
      );
    } catch (err) {
      setTestResult({
        connected: false,
        latencyMs: 0,
        model: form.model,
        responsePreview: "",
        error: err instanceof Error ? err.message : "Connection failed",
      });
    }
    setTesting(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin) return;

    if (!form.apiKey.trim() && !(editingId && editingKeyReadable)) {
      setError(
        editingId
          ? "Re-enter your API key before saving — the stored key is not readable."
          : "API key is required.",
      );
      return;
    }

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

  async function saveExecutionMode(mode: AIExecutionMode) {
    setExecutionMode(mode);
    await fetch("/api/sai/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executionMode: mode }),
    });
    router.refresh();
  }

  async function saveAutoModelRotation(enabled: boolean) {
    setAutoModelRotation(enabled);
    await fetch("/api/sai/ai-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoModelRotation: enabled }),
    });
    router.refresh();
  }

  const catalogCapable = supportsModelCatalog(form.providerName);

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

      <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Execution Mode</h2>
        <p className="mt-1 text-xs text-white/45">
          Free mode enables the intelligent recovery queue before template fallback. Paid mode retries inline only.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {(["free", "paid"] as AIExecutionMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              disabled={!isAdmin}
              onClick={() => saveExecutionMode(mode)}
              className={`rounded-lg border px-4 py-2 text-xs font-medium capitalize transition-colors ${
                executionMode === mode
                  ? "border-cyan-400/40 bg-cyan-500/20 text-white"
                  : "border-white/10 text-white/50 hover:bg-white/5"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Model Failover</h2>
        <p className="mt-1 text-xs text-white/45">
          When enabled, agent and session API calls retry with alternate models from your NVIDIA NIM (or
          other catalog) pool if the primary model fails — before switching to a fallback provider.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => saveAutoModelRotation(true)}
            className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
              autoModelRotation
                ? "border-purple-400/40 bg-purple-500/20 text-white"
                : "border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            Auto-rotate models on failure
          </button>
          <button
            type="button"
            disabled={!isAdmin}
            onClick={() => saveAutoModelRotation(false)}
            className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
              !autoModelRotation
                ? "border-purple-400/40 bg-purple-500/20 text-white"
                : "border-white/10 text-white/50 hover:bg-white/5"
            }`}
          >
            Primary model only
          </button>
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
                placeholder="Paste NVIDIA API key (nvapi-...)"
                className={inputClass}
                autoComplete="off"
              />
              <p className="mt-1 text-[10px] text-white/35">
                {editingId
                  ? editingKeyReadable
                    ? "Saved key is readable — Test works without re-entering. Re-enter only to rotate the key."
                    : "Re-enter your key once to fix encryption, then Save."
                  : "Keys are encrypted at rest. Never displayed after save."}
              </p>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Endpoint</span>
              <input value={form.endpoint} onChange={(e) => setForm({ ...form, endpoint: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Primary Model</span>
              {catalogModels.length > 0 ? (
                <select
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  className={`${inputClass} bg-[#0d0d14]`}
                >
                  {catalogModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={inputClass} />
              )}
            </label>

            {catalogCapable && (
              <div className="sm:col-span-2 space-y-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-cyan-200">Model Catalog</p>
                    <p className="mt-0.5 text-[10px] text-white/45">
                      Load all models from {getProviderLabel(form.providerName)} via your API key and endpoint.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadCatalogModels}
                    disabled={catalogLoading}
                    className="rounded-lg border border-cyan-400/30 px-3 py-1.5 text-xs text-cyan-200 disabled:opacity-60"
                  >
                    {catalogLoading ? "Loading…" : "Load Catalog Models"}
                  </button>
                </div>
                {catalogError && <p className="text-xs text-red-300">{catalogError}</p>}
                {catalogModels.length > 0 && (
                  <>
                    <p className="text-[10px] text-white/40">
                      {catalogModels.length} models available · select fallbacks or auto-rotate all
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={useAllCatalogForRotation}
                        className="rounded border border-purple-400/30 px-2 py-1 text-[10px] text-purple-200"
                      >
                        Use all for auto-failover
                      </button>
                      <button
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, modelPool: [] }))}
                        className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/50"
                      >
                        Clear pool
                      </button>
                    </div>
                    <div className="max-h-40 overflow-y-auto rounded border border-white/10 bg-black/20 p-2">
                      {catalogModels.map((m) => (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-white/70 hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={form.modelPool.includes(m.id)}
                            onChange={() => togglePoolModel(m.id)}
                          />
                          <span className="font-mono text-[11px]">{m.id}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={form.autoRotateModels}
                  onChange={(e) => setForm({ ...form, autoRotateModels: e.target.checked })}
                />
                Auto-rotate through model pool on failure (uses full catalog if pool empty)
              </label>
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
            <div className={`mt-4 rounded-lg border p-4 ${testResult.connected ? "border-emerald-400/30 bg-emerald-500/10" : "border-red-400/30 bg-red-500/10"}`}>
              <p className={`text-sm font-medium ${testResult.connected ? "text-emerald-300" : "text-red-300"}`}>
                {testResult.connected ? "Provider Test Passed" : "Provider Test Failed"}
              </p>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <div>
                  <dt className="text-white/40">Provider</dt>
                  <dd className="text-white/80">{testResult.providerLabel ?? testResult.provider ?? form.providerName}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Model</dt>
                  <dd className="text-white/80">{testResult.model}</dd>
                </div>
                <div>
                  <dt className="text-white/40">Latency</dt>
                  <dd className="text-white/80">{testResult.latencyMs}ms</dd>
                </div>
                <div>
                  <dt className="text-white/40">Token Estimate</dt>
                  <dd className="text-white/80">
                    {testResult.estimatedInputTokens ?? "—"} input
                    {testResult.outputTokens != null ? ` · ${testResult.outputTokens} output` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-white/40">Prompt Size</dt>
                  <dd className="text-white/80">{testResult.promptLength ?? "—"} chars</dd>
                </div>
                <div>
                  <dt className="text-white/40">Timeout</dt>
                  <dd className="text-white/80">{testResult.timeoutMs ? `${testResult.timeoutMs / 1000}s` : "45s"}</dd>
                </div>
              </dl>
              {testResult.connected ? (
                <div className="mt-3 rounded border border-white/10 bg-black/20 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Response</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-white/70">{testResult.responsePreview}</p>
                </div>
              ) : (
                <p className="mt-3 text-xs text-red-200/80">{testResult.error}</p>
              )}
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Save
            </button>
            <button type="button" onClick={handleTest} disabled={testing} className="rounded-lg border border-cyan-400/30 px-4 py-2 text-xs text-cyan-300 disabled:opacity-60">
              {testing ? "Testing…" : "Test Provider"}
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
              <th className="px-4 py-3">Failover</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Default</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-white/40">
                  No AI providers configured. Add one to enable agent runtime.
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3">
                    <p className="text-white">{getProviderLabel(p.providerName)}</p>
                    <p className="text-[10px] text-white/35">
                      {p.keyReadable ? "Key configured (readable)" : p.hasApiKey ? "Key saved (re-enter to use)" : "No key"}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-white/70">{p.model}</td>
                  <td className="px-4 py-3 text-xs text-white/55">
                    {p.autoRotateModels
                      ? p.modelPool.length > 0
                        ? `${p.modelPool.length} in pool`
                        : "Auto (full catalog)"
                      : p.modelPool.length > 0
                        ? `${p.modelPool.length} manual`
                        : "—"}
                  </td>
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
