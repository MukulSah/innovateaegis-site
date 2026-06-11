import { AISettingsView } from "@/components/sai/ai-settings-view";
import { SectionPage } from "@/components/sai/section-page";
import { getAIProviders } from "@/lib/sai/ai-providers";
import { getCompanyAISettings } from "@/lib/sai/ai-settings";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AISettingsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isFounder(currentUser.profile)) {
    redirect("/sai");
  }

  let providers: Awaited<ReturnType<typeof getAIProviders>> = [];
  let settings: Awaited<ReturnType<typeof getCompanyAISettings>> = {
    id: "",
    modelMode: "single",
    defaultProviderId: null,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      [providers, settings] = await Promise.all([getAIProviders(), getCompanyAISettings()]);
    } catch {
      // keep defaults
    }
  }

  return (
    <SectionPage
      title="Founder AI Configuration Center"
      subtitle="AI providers"
      description="Configure AI providers, test connections, set the company default model, and control per-agent overrides. API keys are encrypted and never exposed in the UI."
    >
      <AISettingsView providers={providers} settings={settings} isAdmin />
    </SectionPage>
  );
}
