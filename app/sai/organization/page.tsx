import { OrganizationView } from "@/components/sai/organization-view";
import { getSession } from "@/lib/sai/api-auth";
import { displayName } from "@/lib/sai/current-user.types";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { getOrganizationHeadquartersData } from "@/lib/sai/organization-headquarters";
import type { OrganizationSection } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const VALID_SECTIONS = new Set<OrganizationSection>([
  "agent-center",
  "active-sessions",
  "agent-workspaces",
  "departments",
  "employees",
  "capacity",
  "structure",
]);

type Props = {
  searchParams: Promise<{ section?: string }>;
};

export default async function OrganizationPage({ searchParams }: Props) {
  const { section: rawSection } = await searchParams;
  const section =
    rawSection && VALID_SECTIONS.has(rawSection as OrganizationSection)
      ? (rawSection as OrganizationSection)
      : null;

  const [session, currentUser] = await Promise.all([getSession(), getCurrentUser()]);
  const supabaseConfigured = isSupabaseConfigured();
  const founderName = currentUser ? displayName(currentUser.profile) : "Founder";

  let data = await getOrganizationHeadquartersData(founderName);

  if (!supabaseConfigured) {
    data = { ...data, founderName };
  }

  return (
    <OrganizationView
      data={data}
      section={section}
      isAdmin={session?.role === "owner"}
      supabaseConfigured={supabaseConfigured}
    />
  );
}
