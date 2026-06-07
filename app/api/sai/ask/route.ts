import { NextResponse } from "next/server";
import { getSAIResponse } from "@/lib/sai/data";

export async function POST(request: Request) {
  const body = await request.json();
  const { query } = body as { query?: string };

  if (!query?.trim()) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700));

  const response = getSAIResponse(query.trim());

  return NextResponse.json({ response });
}
