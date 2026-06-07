import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { searchCompanyKnowledge } from "@/lib/sai/knowledge";
import { SAI_AUTH_COOKIE } from "@/lib/sai/auth";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get(SAI_AUTH_COOKIE)?.value;

  if (auth !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  const results = await searchCompanyKnowledge(q);
  return NextResponse.json(results);
}
