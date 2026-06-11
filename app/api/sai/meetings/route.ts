import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { createMeeting, getMeetings } from "@/lib/sai/meetings";

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get("status") ?? undefined;
  try {
    return NextResponse.json({ meetings: await getMeetings({ status }) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load meetings" },
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
    const meeting = await createMeeting({
      topic: body.topic,
      meetingType: body.meetingType,
      participantAgentIds: body.participantAgentIds,
      participantNames: body.participantNames,
      agenda: body.agenda,
      scheduledAt: body.scheduledAt,
      relatedProjectId: body.relatedProjectId,
      relatedDiscussionId: body.relatedDiscussionId,
      createdBy: user.user.id,
    });
    revalidatePath("/sai/founder");
    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create meeting" },
      { status: 500 },
    );
  }
}
