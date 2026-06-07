import { TaskWorkspace } from "@/components/sai/task-workspace";
import { SectionPage } from "@/components/sai/section-page";
import { cookies } from "next/headers";
import { sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);
  const companyId = await getCompanyId();

  const assigneeId = user?.id ?? "";
  const tasks = await prisma.task.findMany({
    where: {
      project: { companyId },
      assigneeId,
    },
    include: { project: { select: { name: true } } },
    orderBy: [{ isBlocker: "desc" }, { dueDate: "asc" }],
  });

  const notifications = user
    ? await prisma.userNotification.findMany({
        where: { userId: user.id, read: false },
        orderBy: { createdAt: "desc" },
        take: 10,
      })
    : [];

  const serializedTasks = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
  }));

  return (
    <SectionPage
      title="My Workspace"
      subtitle={user?.name ?? "Employee"}
      description="View assigned tasks, update progress, and collaborate with comments."
    >
      {notifications.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.1em] text-white/40">Notifications</h2>
          {notifications.map((n) => (
            <div key={n.id} className="rounded-lg border border-cyan-400/15 bg-cyan-500/5 px-4 py-2 text-xs text-white/70">
              <strong className="text-white">{n.title}</strong> — {n.message}
            </div>
          ))}
        </div>
      )}

      <TaskWorkspace tasks={serializedTasks} userName={user?.name ?? "You"} />
    </SectionPage>
  );
}
