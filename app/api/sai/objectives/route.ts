import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAutonomousObjective } from "@/lib/sai/autonomous-objectives";
import { getObjectives } from "@/lib/sai/queries";
import { SAI_AUTH_COOKIE, sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";

export async function GET() {
  const cookieStore = await cookies();
  const auth = cookieStore.get(SAI_AUTH_COOKIE)?.value;

  if (auth !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const objectives = await getObjectives();
  return NextResponse.json(objectives);
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const auth = cookieStore.get(SAI_AUTH_COOKIE)?.value;

  if (auth !== "authenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);
  if (session?.role !== "owner") {
    return NextResponse.json({ error: "Only owners can create objectives" }, { status: 403 });
  }

  const body = await request.json();
  const { title, businessGoal, priority, targetDate, successMetrics, impactScore } = body as {
    title?: string;
    businessGoal?: string;
    priority?: string;
    targetDate?: string;
    successMetrics?: string[];
    impactScore?: number;
  };

  if (!title?.trim() || !businessGoal?.trim()) {
    return NextResponse.json({ error: "Title and business goal are required" }, { status: 400 });
  }

  const result = await createAutonomousObjective({
    title: title.trim(),
    businessGoal: businessGoal.trim(),
    priority: priority as never,
    targetDate: targetDate ? new Date(targetDate) : undefined,
    successMetrics,
    impactScore,
    ownerId: session.id,
  });

  return NextResponse.json(result, { status: 201 });
}
