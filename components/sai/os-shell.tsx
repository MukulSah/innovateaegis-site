"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/sai/auth";
import { company } from "@/lib/sai/data";

const nav = [
  { label: "Dashboard", href: "/os", icon: "◎" },
  { label: "Ask SAI", href: "/os/ask", icon: "✦" },
  { label: "SAI Brain", href: "/os/brain", icon: "❖" },
  { label: "Projects", href: "/os/projects", icon: "▣" },
  { label: "People", href: "/os/people", icon: "◍" },
  { label: "AI Agents", href: "/os/agents", icon: "⬡" },
  { label: "Company Memory", href: "/os/memory", icon: "❑" },
  { label: "Digital Twin", href: "/os/twin", icon: "◈" },
];

export function OsShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm uppercase tracking-[0.2em] text-white/40">
          Loading SAI COMPANY…
        </p>
      </div>
    );
  }

  const isActive = (href: string) =>
    href === "/os" ? pathname === "/os" : pathname.startsWith(href);

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar */}
      <aside className="sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col border-r border-white/10 bg-[#070714]/80 backdrop-blur-xl md:flex">
        <SidebarContent
          nav={nav}
          isActive={isActive}
          user={user}
          onLogout={() => {
            logout();
            router.replace("/login");
          }}
        />
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#070714]/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <Link href="/os" className="gradient-text text-sm font-bold uppercase tracking-[0.18em]">
          {company.name}
        </Link>
        <button
          type="button"
          onClick={() => setMobileNav((v) => !v)}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-white/70"
        >
          Menu
        </button>
      </header>

      {mobileNav && (
        <div className="border-b border-white/10 bg-[#070714]/95 px-3 py-3 md:hidden">
          <SidebarContent
            nav={nav}
            isActive={isActive}
            user={user}
            onNavigate={() => setMobileNav(false)}
            onLogout={() => {
              logout();
              router.replace("/login");
            }}
          />
        </div>
      )}

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function SidebarContent({
  nav,
  isActive,
  user,
  onLogout,
  onNavigate,
}: {
  nav: { label: string; href: string; icon: string }[];
  isActive: (href: string) => boolean;
  user: { name: string; title: string; role: string };
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col p-4">
      <Link href="/os" className="hidden px-2 py-2 md:block">
        <span className="gradient-text text-base font-bold uppercase tracking-[0.16em]">
          SAI COMPANY
        </span>
        <span className="mt-0.5 block text-[10px] uppercase tracking-[0.18em] text-white/35">
          Company Operating System
        </span>
      </Link>

      <nav className="mt-3 flex-1 space-y-1">
        {nav.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border border-purple-400/30 bg-purple-500/15 text-white"
                  : "text-white/60 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className={`text-base ${active ? "text-purple-300" : "text-white/40"}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-cyan-500 text-xs font-bold text-white">
            {user.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user.name}</p>
            <p className="truncate text-[11px] uppercase tracking-[0.1em] text-purple-300/70">
              {user.role}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
