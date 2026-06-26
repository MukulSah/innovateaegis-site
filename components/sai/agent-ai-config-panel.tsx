"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getProviderLabel } from "@/lib/sai/ai-provider-catalog";
import type { AgentAIConfig, AIProvider, AIProviderName, AIModelMode, ReasoningLevel } from "@/lib/sai/types";

type Props = {
  agentId: string;
  config: AgentAIConfig | null;
  modelMode: AIModelMode;
  providers: AIProvider[];
};

const REASONING_LEVELS: ReasoningLevel[] = ["minimal", "standard", "deep"];

export function AgentAIConfigPanel({ agentId, config, modelMode, providers }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(config?.enabled ?? true);
  const [providerId, setProviderId] = useState(config?.providerId ?? "");
  const [model, setModel] = useState(config?.model ?? "");
  const [temperature, setTemperature] = useState(config?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(config?.maxTokens ?? 4096);
  const [reasoningLevel, setReasoningLevel] = useState<ReasoningLevel>(config?.reasoningLevel ?? "standard");
  const [systemPrompt, setSystemPrompt] = useState(config?.systemPrompt ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  if (modelMode !== "per_agent") {
    const defaultProvider = providers.find((p) => p.defaultProvider) ?? providers[0];
    return (
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Agent AI Settings</h3>
        <p className="mt-2 text-xs text-white/45">
          All agents use the company default provider
          {defaultProvider
            ? ` (${getProviderLabel(defaultProvider.providerName)} · ${defaultProvider.model})`
            : ""}
          . Session launch picks Auto or a fixed model; failures rotate through your saved pool.
        </p>
        {defaultProvider && (
          <p className="mt-2 text-[10px] text-cyan-200/80">
            Failover pool:{" "}
            {defaultProvider.autoRotateModels
              ? defaultProvider.modelPool.length > 0
                ? `${defaultProvider.modelPool.length} models configured`
                : "Auto (full catalog on failure)"
              : defaultProvider.modelPool.length > 0
                ? `${defaultProvider.modelPool.length} manual fallbacks`
                : "Primary model only"}
          </p>
        )}
        <a href="/sai/settings?tab=ai" className="mt-3 inline-block text-xs text-purple-300 hover:text-purple-200">
          Edit AI providers & model pool →
        </a>
      </section>
    );
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/sai/agents/${agentId}/ai-config`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        providerId: providerId || null,
        model: model || null,
        temperature,
        maxTokens,
        reasoningLevel,
        systemPrompt,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Save failed");
    } else {
      setMessage("Saved");
      router.refresh();
    }
    setSaving(false);
  }

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <h3 className="text-sm font-semibold text-white">Agent AI Override</h3>
      <p className="mt-1 text-xs text-white/45">
        Override provider, model, temperature, system prompt, and reasoning for this agent.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded"
          />
          Enabled
        </label>

        <label className="block text-xs text-white/50">
          Provider
          <select
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
          >
            <option value="">Company default</option>
            {providers.filter((p) => p.enabled).map((p) => (
              <option key={p.id} value={p.id}>
                {getProviderLabel(p.providerName as AIProviderName)} · {p.model}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-white/50">
          Model
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Override model name"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block text-xs text-white/50">
          Temperature ({temperature})
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <label className="block text-xs text-white/50">
          Max Tokens
          <input
            type="number"
            min={256}
            max={128000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>

        <label className="block text-xs text-white/50">
          Reasoning Level
          <select
            value={reasoningLevel}
            onChange={(e) => setReasoningLevel(e.target.value as ReasoningLevel)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
          >
            {REASONING_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-xs text-white/50 sm:col-span-2">
          System Prompt
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={3}
            placeholder="Optional custom system prompt"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </label>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Agent AI Config"}
        </button>
        {message && <span className="text-xs text-white/50">{message}</span>}
      </div>
    </section>
  );
}
