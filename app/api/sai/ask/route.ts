import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { askSAI } from "@/lib/sai/ask-engine";
import { SAI_AUTH_COOKIE } from "@/lib/sai/auth";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get(SAI_AUTH_COOKIE)?.value;

  if (auth !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { query } = body as { query?: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const response = await askSAI(query.trim());

  return NextResponse.json({ response });
}
