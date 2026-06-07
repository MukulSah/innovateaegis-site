import { cookies } from "next/headers";
import { AskSAIPanel } from "@/components/sai/ask-sai";
import { OwnerDashboardPanel } from "@/components/sai/owner-dashboard";
import { sessionFromCookie, SAI_USER_COOKIE } from "@/lib/sai/auth";
import { getOwnerDashboard } from "@/lib/sai/owner-dashboard";

export default async function SAIDashboardPage() {
  const cookieStore = await cookies();
  const user = sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);
  const dashboard = await getOwnerDashboard();

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Welcome back, {user?.name ?? "Founder"}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">
          Operations Dashboard
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Actionable view of projects, objectives, blockers, and recent activity across your company.
        </p>
      </header>

      <OwnerDashboardPanel data={dashboard} />

      <AskSAIPanel />
    </div>
  );
}
