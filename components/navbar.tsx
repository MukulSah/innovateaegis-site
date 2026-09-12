"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { announcements } from "@/lib/announcements";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { productGroups } from "@/lib/products";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Studio", href: "/#studio" },
  { label: "Connect", href: "/#connect" },
  { label: "About", href: "/#about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isProductsActive = pathname.startsWith("/products");
  const isSAIRoute = pathname.startsWith("/sai") || pathname === "/login";
  if (isSAIRoute) return null;

  return (
    <header className="site-header fixed inset-x-0 top-3.5 mx-auto w-[min(1120px,calc(100%-1.25rem))] overflow-visible">
      <div className="overflow-visible rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(22,18,16,0.88),rgba(10,9,12,0.78))] shadow-[0_18px_60px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
        <div className="announcement-ticker rounded-t-2xl border-b border-white/10 bg-white/[0.03] px-4 text-[11px] tracking-[0.12em] text-[#e8d5bf]/80">
          {announcements.map((item) => (
            <Link key={item.id} href={item.href} className="hover:text-[#f6f1e8]">
              <span className="shrink-0 rounded-full border border-[#d4b896]/30 px-2 py-0.5 text-[10px] uppercase text-[#d4b896]">
                {item.eyebrow}
              </span>
              <span className="min-w-0 truncate">{item.title}</span>
            </Link>
          ))}
        </div>

        <div className="px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="font-serif text-lg font-semibold tracking-[0.08em] text-[#f6f1e8]"
            >
              Innovative Aegis
            </Link>

            <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  href={item.href}
                  active={item.href === "/" ? pathname === "/" : false}
                >
                  {item.label}
                </NavLink>
              ))}

              <div className="group relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  className={`nav-link flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                    isProductsActive ? "text-white" : "text-white/60 hover:text-white group-hover:text-white group-focus-within:text-white"
                  }`}
                >
                  Products
                  <span className="text-[10px] text-[#d4b896]/70">▼</span>
                </button>

                <div
                  role="menu"
                  className="absolute right-0 top-full z-[2] hidden w-[min(380px,calc(100vw-2rem))] pt-2 group-hover:block group-focus-within:block"
                >
                  <div className="products-flyout-panel rounded-xl p-4">
                    <DropdownGroup title="For people">
                      {productGroups.users.map((product) => (
                        <DropdownLink
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          meta={product.statusLabel}
                        >
                          {product.name}
                        </DropdownLink>
                      ))}
                    </DropdownGroup>

                    <DropdownGroup title="For companies">
                      {productGroups.business.map((product) => (
                        <DropdownLink
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          meta={product.statusLabel}
                        >
                          {product.name}
                        </DropdownLink>
                      ))}
                    </DropdownGroup>

                    <div className="mt-3 border-t border-white/10 pt-3">
                      <Link
                        href="/products"
                        className="text-xs font-medium uppercase tracking-[0.14em] text-[#d4b896] transition-colors duration-200 hover:text-[#f6f1e8]"
                      >
                        View the house
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </nav>

            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/auth/login"
                className="rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/75 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href={isProductsActive ? "/#connect" : "#connect"}
                className="lux-btn rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-200"
              >
                Connect
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden rounded-lg border border-[#d4b896]/25 bg-[#d4b896]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#f4efe6]"
            >
              Menu
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={getFramerTransition({
                duration: motionTokens.duration.quick,
              })}
              className="border-t border-white/8 bg-[#0c0b0f]/95 p-4 md:hidden"
            >
              <div className="space-y-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block text-sm text-white/80"
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/auth/login"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm font-semibold text-[#d4b896]"
                >
                  Login
                </Link>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  Products
                </p>
                <div className="mt-2 space-y-1">
                  {[...productGroups.users, ...productGroups.business].map((product) => (
                    <Link
                      key={product.slug}
                      href={`/products/${product.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm text-white/60 hover:bg-white/5"
                    >
                      {product.name}
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-[#d4b896]/70">
                        {product.statusLabel}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
}

type NavLinkProps = {
  href: string;
  children: React.ReactNode;
  active?: boolean;
};

function NavLink({ href, children, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      className={`nav-link relative text-sm font-medium transition-colors duration-200 ${
        active ? "text-white" : "text-white/60 hover:text-white"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-gradient-to-r from-[#d4b896] via-[#9ec5d4] to-transparent transition-transform duration-200 ${
          active ? "scale-x-100" : "scale-x-0"
        }`}
      />
    </Link>
  );
}

type DropdownGroupProps = {
  title: string;
  children: React.ReactNode;
};

function DropdownGroup({ title, children }: DropdownGroupProps) {
  return (
    <div className="mb-3 rounded-lg border border-white/8 bg-white/[0.03] p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4b896]/80">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

type DropdownLinkProps = {
  href: string;
  children: React.ReactNode;
  meta?: string;
};

function DropdownLink({ href, children, meta }: DropdownLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-md px-2 py-2 text-sm text-white/70 transition-all duration-200 hover:translate-x-1 hover:bg-white/5 hover:text-white"
    >
      <span>{children}</span>
      {meta ? (
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#d4b896]/70">{meta}</span>
      ) : null}
    </Link>
  );
}
