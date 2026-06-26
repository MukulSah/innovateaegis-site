import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";

export type BugbotDefaults = {
  triggerMode: "every_push" | "manual";
  reviewDraftPrs: boolean;
  prSummaries: boolean;
  autofixMode: "off" | "on";
  autofixSeverityThreshold: string[];
  incrementalReview: boolean;
};

export type CompanyAutomationSettings = {
  id: string;
  bugbotEnabled: boolean;
  bugbotDefaults: BugbotDefaults;
  repositoryRules: unknown[];
  updatedAt: string;
};

const DEFAULT_BUGBOT: BugbotDefaults = {
  triggerMode: "every_push",
  reviewDraftPrs: false,
  prSummaries: true,
  autofixMode: "off",
  autofixSeverityThreshold: ["low", "medium", "high"],
  incrementalReview: false,
};

type Row = {
  id: string;
  bugbot_enabled: boolean;
  bugbot_defaults: BugbotDefaults;
  repository_rules: unknown[];
  updated_at: string;
};

function mapRow(row: Row): CompanyAutomationSettings {
  return {
    id: row.id,
    bugbotEnabled: row.bugbot_enabled,
    bugbotDefaults: { ...DEFAULT_BUGBOT, ...(row.bugbot_defaults ?? {}) },
    repositoryRules: row.repository_rules ?? [],
    updatedAt: row.updated_at,
  };
}

export async function getCompanyAutomationSettings(): Promise<CompanyAutomationSettings> {
  if (!isSupabaseConfigured()) {
    return {
      id: "",
      bugbotEnabled: true,
      bugbotDefaults: DEFAULT_BUGBOT,
      repositoryRules: [],
      updatedAt: new Date().toISOString(),
    };
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("company_automation_settings")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return {
      id: "",
      bugbotEnabled: true,
      bugbotDefaults: DEFAULT_BUGBOT,
      repositoryRules: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return mapRow(data as Row);
}

export async function updateCompanyAutomationSettings(
  patch: Partial<{
    bugbotEnabled: boolean;
    bugbotDefaults: Partial<BugbotDefaults>;
    repositoryRules: unknown[];
  }>,
): Promise<CompanyAutomationSettings> {
  const existing = await getCompanyAutomationSettings();
  const supabase = createSupabaseAdmin();

  const payload = {
    bugbot_enabled: patch.bugbotEnabled ?? existing.bugbotEnabled,
    bugbot_defaults: patch.bugbotDefaults
      ? { ...existing.bugbotDefaults, ...patch.bugbotDefaults }
      : existing.bugbotDefaults,
    repository_rules: patch.repositoryRules ?? existing.repositoryRules,
    updated_at: new Date().toISOString(),
  };

  if (existing.id) {
    const { data, error } = await supabase
      .from("company_automation_settings")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as Row);
  }

  const { data, error } = await supabase
    .from("company_automation_settings")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as Row);
}
