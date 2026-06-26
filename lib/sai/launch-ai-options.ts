import { getDefaultAIProvider, getProviderWithKey } from "./ai-providers";
import { getCompanyAISettings } from "./ai-settings";
import { getProviderLabel } from "./ai-provider-catalog";
import type { AIProviderName } from "./types";

export type SessionAiModelMode = "auto" | "fixed";

export type SessionAiConfig = {
  mode: SessionAiModelMode;
  /** Primary model when mode=fixed; starting model when mode=auto */
  model: string | null;
  modelPool: string[];
  autoRotate: boolean;
  providerId: string | null;
  providerName: AIProviderName | null;
};

export type LaunchAiOption = {
  value: string;
  label: string;
  description: string;
};

export type LaunchAiOptions = {
  defaultMode: SessionAiModelMode;
  primaryModel: string;
  modelPool: string[];
  autoRotate: boolean;
  autoModelRotation: boolean;
  providerId: string | null;
  providerName: AIProviderName | null;
  providerLabel: string | null;
  options: LaunchAiOption[];
};

/** Company default provider pool — used for launch UI and session auto mode. */
export async function getLaunchAiOptions(): Promise<LaunchAiOptions> {
  const settings = await getCompanyAISettings();
  let providerRow = settings.defaultProviderId
    ? await getProviderWithKey(settings.defaultProviderId)
    : null;
  if (!providerRow) {
    providerRow = await getDefaultAIProvider();
  }

  if (!providerRow) {
    return {
      defaultMode: "auto",
      primaryModel: "",
      modelPool: [],
      autoRotate: true,
      autoModelRotation: settings.autoModelRotation ?? true,
      providerId: null,
      providerName: null,
      providerLabel: null,
      options: [
        {
          value: "auto",
          label: "Auto — no provider configured",
          description: "Add an AI provider in Settings first",
        },
      ],
    };
  }

  const { provider } = providerRow;
  const pool = dedupeModels([provider.model, ...provider.modelPool]);
  const autoRotate = (settings.autoModelRotation ?? true) && provider.autoRotateModels;

  const options: LaunchAiOption[] = [
    {
      value: "auto",
      label: "Auto — rotate from saved pool",
      description: autoRotate
        ? pool.length > 1
          ? `${pool.length} models · failover enabled`
          : "Uses provider primary · failover enabled"
        : "Uses provider primary model",
    },
    ...pool.map((model) => ({
      value: model,
      label: model,
      description: "Fixed model for this session (still fails over to pool if enabled)",
    })),
  ];

  return {
    defaultMode: "auto",
    primaryModel: provider.model,
    modelPool: pool,
    autoRotate,
    autoModelRotation: settings.autoModelRotation ?? true,
    providerId: provider.id,
    providerName: provider.providerName,
    providerLabel: getProviderLabel(provider.providerName),
    options,
  };
}

export function parseSessionAiConfig(brief: Record<string, unknown> | null | undefined): SessionAiConfig | null {
  if (!brief || typeof brief !== "object") return null;
  const mode = brief.aiModelMode === "fixed" ? "fixed" : brief.aiModelMode === "auto" ? "auto" : null;
  if (!mode) return null;

  const pool = Array.isArray(brief.aiModelPool)
    ? brief.aiModelPool.map((m) => String(m).trim()).filter(Boolean)
    : [];

  return {
    mode,
    model: typeof brief.aiModel === "string" ? brief.aiModel : null,
    modelPool: pool,
    autoRotate: brief.aiAutoRotate !== false,
    providerId: typeof brief.aiProviderId === "string" ? brief.aiProviderId : null,
    providerName:
      typeof brief.aiProviderName === "string" ? (brief.aiProviderName as AIProviderName) : null,
  };
}

export function buildSessionAiBrief(
  launch: LaunchAiOptions,
  selection: string,
): Record<string, unknown> {
  const isAuto = selection === "auto";
  const fixedModel = isAuto ? launch.primaryModel : selection;
  const pool = isAuto
    ? launch.modelPool
    : dedupeModels([selection, ...launch.modelPool.filter((m) => m !== selection)]);

  return {
    aiModelMode: isAuto ? "auto" : "fixed",
    aiModel: isAuto ? launch.primaryModel : fixedModel,
    aiModelPool: pool,
    aiAutoRotate: launch.autoRotate,
    aiProviderId: launch.providerId,
    aiProviderName: launch.providerName,
  };
}

function dedupeModels(models: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of models) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function getSessionAiConfig(sessionId: string): Promise<SessionAiConfig | null> {
  const { getWorkflowRunById } = await import("./workflows");
  const run = await getWorkflowRunById(sessionId);
  if (!run?.strategicBrief) return null;
  return parseSessionAiConfig(run.strategicBrief as Record<string, unknown>);
}
