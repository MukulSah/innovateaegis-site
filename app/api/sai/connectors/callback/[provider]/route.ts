import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { encryptSecret } from "@/lib/sai/crypto";

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { provider } = await params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const origin = new URL(request.url).origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/sai/resources?error=oauth_cancelled`);
  }

  try {
    let accessToken = "";
    let accountIdentifier = "";
    let accountLabel = "";

    if (provider === "github") {
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error("GitHub OAuth not configured");

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: `${origin}/api/sai/connectors/callback/github`,
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      if (!accessToken) throw new Error("GitHub token exchange failed");

      const userRes = await fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await userRes.json();
      accountIdentifier = user.login ?? "";
      accountLabel = user.name ?? user.login ?? "GitHub";
    } else if (provider === "google_drive") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error("Google OAuth not configured");

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${origin}/api/sai/connectors/callback/google_drive`,
          grant_type: "authorization_code",
        }),
      });
      const tokenData = await tokenRes.json();
      accessToken = tokenData.access_token;
      if (!accessToken) throw new Error("Google token exchange failed");

      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const user = await userRes.json();
      accountIdentifier = user.email ?? "";
      accountLabel = user.name ?? "Google Drive";
    } else {
      throw new Error("Unknown provider");
    }

    const supabase = createSupabaseAdmin();
    await supabase.from("integration_accounts").insert({
      provider,
      account_label: accountLabel,
      account_identifier: accountIdentifier,
      access_token_encrypted: encryptSecret(accessToken),
      scopes: provider === "github" ? ["repo", "read:user"] : ["drive.readonly"],
      status: "active",
    });

    return NextResponse.redirect(`${origin}/sai/resources?connected=${provider}`);
  } catch {
    return NextResponse.redirect(`${origin}/sai/resources?error=oauth_failed`);
  }
}
