import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { IntegrationAccount } from "../types";

type AccountRow = {
  id: string;
  provider: IntegrationAccount["provider"];
  account_label: string;
  account_identifier: string;
  status: string;
  scopes: string[];
  created_at: string;
};

function mapRow(row: AccountRow): IntegrationAccount {
  return {
    id: row.id,
    provider: row.provider,
    accountLabel: row.account_label,
    accountIdentifier: row.account_identifier,
    status: row.status,
    scopes: row.scopes ?? [],
    createdAt: row.created_at,
  };
}

export async function getIntegrationAccounts(): Promise<IntegrationAccount[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("integration_accounts")
    .select("id, provider, account_label, account_identifier, status, scopes, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as AccountRow[]).map(mapRow);
}

export async function deleteIntegrationAccount(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("integration_accounts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function getOAuthAuthorizeUrl(
  provider: "github" | "google_drive",
  origin: string,
): string | null {
  if (provider === "github") {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return null;
    const redirect = `${origin}/api/sai/connectors/callback/github`;
    const scope = "repo,read:user";
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&scope=${encodeURIComponent(scope)}`;
  }
  if (provider === "google_drive") {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return null;
    const redirect = `${origin}/api/sai/connectors/callback/google_drive`;
    const scope = "https://www.googleapis.com/auth/drive.readonly";
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  }
  return null;
}
