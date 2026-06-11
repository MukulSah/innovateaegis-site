import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getInboxNotifications, getNotifications, markAllNotificationsRead } from "@/lib/sai/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  try {
    if (view === "inbox") {
      return NextResponse.json(await getInboxNotifications());
    }
    const category = searchParams.get("category") ?? undefined;
    const isRead = searchParams.get("isRead");
    return NextResponse.json({
      notifications: await getNotifications({
        recipientType: "founder",
        category: category as Parameters<typeof getNotifications>[0] extends infer T
          ? T extends { category?: infer C }
            ? C
            : never
          : never,
        isRead: isRead === "true" ? true : isRead === "false" ? false : undefined,
        limit: 100,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH() {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markAllNotificationsRead();
    revalidatePath("/sai/inbox");
    revalidatePath("/sai");
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to mark notifications read" },
      { status: 500 },
    );
  }
}
