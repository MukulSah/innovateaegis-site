import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { createFounderDiscussion, getFounderDiscussions } from "@/lib/sai/founder-workspace";

export async function GET() {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json({ discussions: await getFounderDiscussions() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load discussions" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  if (!body.topic?.trim()) {
    return NextResponse.json({ error: "Topic required" }, { status: 400 });
  }

  try {
    const discussion = await createFounderDiscussion({
      topic: body.topic,
      participantAgentIds: body.participantAgentIds ?? [],
      participantNames: body.participantNames ?? [],
      objective: body.objective,
      context: body.context,
      priority: body.priority,
      relatedProjectIds: body.relatedProjectIds,
      createdBy: user.user.id,
    });
    return NextResponse.json({ discussion }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create discussion" },
      { status: 500 },
    );
  }
}
