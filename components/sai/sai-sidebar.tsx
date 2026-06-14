"use client";



import Link from "next/link";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useEffect, useState } from "react";

import { HEADQUARTERS_NAV_ITEMS } from "@/lib/sai/headquarters";

import { roleLabel, type CurrentUser } from "@/lib/sai/current-user.types";



type Props = {

  user: CurrentUser | null;

};



function navItemKey(item: { group?: string; label: string }) {
  return `${item.group ?? "nav"}-${item.label}`;
}

function navPath(href: string) {

  return href.split("?")[0];

}



function isNavActive(pathname: string, href: string) {

  const path = navPath(href);

  return pathname === path || pathname.startsWith(`${path}/`);

}



function isChildActive(pathname: string, searchParams: URLSearchParams, href: string) {
  const [path, query] = href.split("?");
  if (!isNavActive(pathname, path)) return false;
  if (!query) {
    return pathname === path && !searchParams.get("section") && !searchParams.get("tab");
  }
  const params = new URLSearchParams(query);
  for (const [key, value] of params.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}



export function SAISidebar({ user }: Props) {

  const profile = user?.profile ?? null;

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const router = useRouter();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});



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



  const navEntries = HEADQUARTERS_NAV_ITEMS.map((item, index) => {

    const previousGroup = HEADQUARTERS_NAV_ITEMS[index - 1]?.group;

    const showGroup = Boolean(item.group && item.group !== previousGroup);

    return { item, showGroup };

  });



  useEffect(() => {
    for (const item of HEADQUARTERS_NAV_ITEMS) {
      if (!item.children?.length) continue;
      const parentActive = isNavActive(pathname, item.href);
      const childActive = item.children.some((child) =>
        isChildActive(pathname, searchParams, child.href),
      );
      if (parentActive || childActive) {
        setExpanded((prev) => ({ ...prev, [navItemKey(item)]: true }));
      }
    }
  }, [pathname, searchParams]);



  return (

    <aside className="flex h-full min-h-0 w-64 shrink-0 flex-col border-r border-white/10 bg-[#08081a]/90 backdrop-blur-xl">

      <div className="shrink-0 border-b border-white/10 p-5">

        <Link href="/sai/founder" className="block">

          <span className="gradient-text text-xs font-bold uppercase tracking-[0.18em]">

            INNOVATEAEGIS

          </span>

          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-white/40">

            Company Operating System

          </p>

        </Link>

      </div>



      <nav

        className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"

        aria-label="SAI navigation"

      >

        <ul className="space-y-0.5">

          {navEntries.map(({ item, showGroup }) => {

            const parentActive = isNavActive(pathname, item.href);

            const childActive = item.children?.some((child) =>

              isChildActive(pathname, searchParams, child.href),

            );

            const active = parentActive || Boolean(childActive);

            const itemKey = navItemKey(item);
            const isOpen = expanded[itemKey] ?? active;

            return (

              <li key={itemKey}>

                {showGroup ? (

                  <p className="mb-2 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35 first:mt-0">

                    {item.group}

                  </p>

                ) : null}

                <div className="flex items-center gap-0.5">

                  <Link

                    href={item.href}

                    className={`flex flex-1 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${

                      active

                        ? "bg-purple-500/15 text-white"

                        : "text-white/60 hover:bg-white/5 hover:text-white/90"

                    }`}

                  >

                    <span className="text-xs text-purple-300/70">{item.icon}</span>

                    {item.label}

                  </Link>

                  {item.children?.length ? (

                    <button

                      type="button"

                      aria-expanded={isOpen}

                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label} menu`}

                      onClick={() =>

                        setExpanded((prev) => ({

                          ...prev,

                          [itemKey]: !isOpen,

                        }))

                      }

                      className="rounded-lg px-2 py-2 text-[10px] text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"

                    >

                      {isOpen ? "▾" : "▸"}

                    </button>

                  ) : null}

                </div>

                {item.children?.length && isOpen ? (

                  <ul className="mb-1 ml-6 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">

                    {item.children.map((child) => {

                      const childIsActive = isChildActive(

                        pathname,

                        searchParams,

                        child.href,

                      );

                      return (

                        <li key={`${itemKey}-${child.label}`}>

                          <Link

                            href={child.href}

                            className={`block rounded-lg px-3 py-1.5 text-xs transition-colors ${

                              childIsActive

                                ? "bg-purple-500/10 text-purple-200"

                                : "text-white/45 hover:bg-white/5 hover:text-white/80"

                            }`}

                          >

                            {child.label}

                          </Link>

                        </li>

                      );

                    })}

                  </ul>

                ) : null}

              </li>

            );

          })}

        </ul>

      </nav>



      <div className="shrink-0 border-t border-white/10 p-4">

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

