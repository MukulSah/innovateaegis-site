"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { roleLabel, type CurrentUser } from "@/lib/sai/current-user.types";

const pillarNav = [
  { label: "Founder Workspace", href: "/sai/founder", icon: "◉" },
  { label: "Company Brain", href: "/sai/brain", icon: "▣" },
  { label: "Agent Factory", href: "/sai/agents", icon: "◇" },
  { label: "Organizational Memory", href: "/sai/memory", icon: "◎" },
];

const executiveNav = [
  { label: "CEO Workspace", href: "/sai/executive/ceo", icon: "★" },
  { label: "COO Workspace", href: "/sai/executive/coo", icon: "★" },
];

const executionNav = [
  { label: "Execution Center", href: "/sai/execution", icon: "▦" },
  { label: "Project Memory", href: "/sai/project-memory", icon: "◎" },
  { label: "Resource Center", href: "/sai/resources", icon: "⬡" },
];

const operationsNav = [
  { label: "Dashboard", href: "/sai", icon: "◈" },
  { label: "Projects", href: "/sai/projects", icon: "▣" },
  { label: "Tasks", href: "/sai/tasks", icon: "▤" },
  { label: "Inbox", href: "/sai/inbox", icon: "✉" },
  { label: "Approvals", href: "/sai/approvals", icon: "✓" },
  { label: "Releases", href: "/sai/releases", icon: "▲" },
];

const intelligenceNav = [
  { label: "Timeline", href: "/sai/timeline", icon: "⏱" },
  { label: "Analytics", href: "/sai/analytics", icon: "◆" },
];

const settingsNav = [
  { label: "AI Configuration", href: "/sai/settings/ai", icon: "⚙" },
  { label: "Governance", href: "/sai/governance", icon: "⚖" },
  { label: "Control Panel", href: "/sai/control", icon: "⬡" },
];

type Props = {
  user: CurrentUser | null;
};

function NavSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { label: string; href: string; icon: string }[];
  pathname: string;
}) {
  return (
    <div className="mb-5">
      <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
        {title}
      </p>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-purple-500/15 text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90"
                }`}
              >
                <span className="text-xs text-purple-300/70">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SAISidebar({ user }: Props) {
  const profile = user?.profile ?? null;
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  }

  const displayName =
    profile?.fullName || profile?.username || profile?.email || "";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-[#08081a]/90 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <Link href="/sai" className="block">
          <span className="gradient-text text-xs font-bold uppercase tracking-[0.18em]">
            INNOVATEAEGIS
          </span>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
            Company Operating System
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="SAI navigation">
        <NavSection title="SAI Headquarters" items={pillarNav} pathname={pathname} />
        <NavSection title="Executive Office" items={executiveNav} pathname={pathname} />
        <NavSection title="Execution" items={executionNav} pathname={pathname} />
        <NavSection title="Operations" items={operationsNav} pathname={pathname} />
        <NavSection title="Intelligence" items={intelligenceNav} pathname={pathname} />
        <NavSection title="Settings" items={settingsNav} pathname={pathname} />
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt=""
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500/20 text-xs font-semibold text-purple-200">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            {profile && (
              <p className="truncate text-[10px] text-white/45">
                {roleLabel(profile.role)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
