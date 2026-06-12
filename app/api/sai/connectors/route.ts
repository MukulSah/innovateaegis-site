import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import {
  deleteIntegrationAccount,
  getIntegrationAccounts,
  getOAuthAuthorizeUrl,
} from "@/lib/sai/connectors";

export async function GET(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const accounts = await getIntegrationAccounts();
    const origin = new URL(request.url).origin;
    return NextResponse.json({
      accounts,
      oauthAvailable: {
        github: Boolean(getOAuthAuthorizeUrl("github", origin)),
        google_drive: Boolean(getOAuthAuthorizeUrl("google_drive", origin)),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load connectors" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const provider = body.provider as "github" | "google_drive";
  const origin = new URL(request.url).origin;
  const url = getOAuthAuthorizeUrl(provider, origin);

  if (!url) {
    return NextResponse.json(
      { error: `OAuth not configured for ${provider}. Set client ID/secret in environment.` },
      { status: 400 },
    );
  }

  return NextResponse.json({ authorizeUrl: url });
}

export async function DELETE(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    await deleteIntegrationAccount(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to disconnect" },
      { status: 500 },
    );
  }
}
