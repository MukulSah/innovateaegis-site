"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { AuthSession } from "@/lib/sai/auth";

const navSections = [
  {
    title: "Operations",
    items: [
      { label: "Dashboard", href: "/sai", icon: "◈" },
      { label: "My Workspace", href: "/sai/workspace", icon: "▤" },
      { label: "Projects", href: "/sai/projects", icon: "▣" },
      { label: "Tasks", href: "/sai/tasks", icon: "▥" },
    ],
  },
  {
    title: "Organization",
    items: [
      { label: "Employees", href: "/sai/employees", icon: "◫" },
      { label: "Documents", href: "/sai/documents", icon: "▦" },
      { label: "Knowledge", href: "/sai/memory", icon: "◎" },
      { label: "Releases", href: "/sai/releases", icon: "▲" },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "GitHub & Notion", href: "/sai/integrations", icon: "◇" },
      { label: "AI Agents", href: "/sai/agents", icon: "◉" },
    ],
  },
];

type Props = {
  user: AuthSession;
};

export function SAISidebar({ user }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/sai/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-white/10 bg-[#08081a]/90 backdrop-blur-xl">
      <div className="border-b border-white/10 p-5">
        <Link href="/sai" className="block">
          <span className="gradient-text text-xs font-bold uppercase tracking-[0.18em]">
            SAI COMPANY
          </span>
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/40">
            Company Operating System
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-4" aria-label="SAI navigation">
        {navSections.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href;
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
        ))}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
          <p className="text-xs font-semibold text-white">{user.name}</p>
          <p className="text-[10px] text-white/45">{user.title}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/5 hover:text-white"
        >
          Exit Headquarters
        </button>
      </div>
    </aside>
  );
}
