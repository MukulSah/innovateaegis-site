import { NextResponse } from "next/server";
import { requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";
import { createKnowledgeRecord } from "@/lib/sai/knowledge";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const companyId = await getCompanyId();
  const meetings = await prisma.meeting.findMany({
    where: { companyId },
    include: {
      organizer: { select: { name: true } },
      project: { select: { name: true } },
      attendees: { include: { user: { select: { name: true } } } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  return NextResponse.json(meetings);
}

export async function POST(request: Request) {
  const { session, error } = await requireSession();
  if (error) return error;

  const body = await request.json();
  const { title, type, agenda, notes, scheduledAt, duration, projectId, attendeeIds } = body as {
    title?: string;
    type?: string;
    agenda?: string;
    notes?: string;
    scheduledAt?: string;
    duration?: number;
    projectId?: string;
    attendeeIds?: string[];
  };

  if (!title?.trim() || !type?.trim()) {
    return NextResponse.json({ error: "Title and type are required" }, { status: 400 });
  }

  const companyId = await getCompanyId();
  const meeting = await prisma.meeting.create({
    data: {
      title: title.trim(),
      type,
      agenda,
      notes,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      duration,
      projectId,
      organizerId: session!.id,
      companyId,
      attendees: attendeeIds?.length
        ? { create: attendeeIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: {
      organizer: { select: { name: true } },
      attendees: { include: { user: { select: { name: true } } } },
    },
  });

  if (notes?.trim()) {
    await createKnowledgeRecord({
      type: "meeting_notes",
      title: `Meeting: ${meeting.title}`,
      content: notes,
      summary: agenda ?? notes.slice(0, 150),
      tags: ["meeting", type],
      projectId,
      meetingId: meeting.id,
      authorId: session!.id,
    });
  }

  await logActivity({
    type: "meeting_created",
    title: `Meeting: ${meeting.title}`,
    companyId,
    userId: session!.id,
    projectId,
    meetingId: meeting.id,
  });

  return NextResponse.json(meeting, { status: 201 });
}
