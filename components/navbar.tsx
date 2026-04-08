"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { productGroups } from "@/lib/products";

const navItems = [
  { label: "Home", href: "/" },
  { label: "Connect", href: "/#connect" },
  { label: "About", href: "/#about" },
];

export function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isProductsActive = useMemo(
    () => pathname.startsWith("/products"),
    [pathname],
  );

  const navTransition = getFramerTransition({
    duration: motionTokens.duration.standard,
  });

  return (
    <motion.header
      animate={{
        top: isScrolled ? 10 : 18,
        scale: isScrolled ? 0.98 : 1,
      }}
      transition={navTransition}
      className="fixed inset-x-0 z-50 mx-auto w-[min(1100px,calc(100%-1.5rem))]"
    >
      <div className="enterprise-glass rounded-2xl border border-white/20 px-4 py-3 shadow-[0_14px_44px_rgba(2,6,23,0.34)] md:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100"
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

            <div
              className="relative"
              onMouseEnter={() => setProductsOpen(true)}
              onMouseLeave={() => setProductsOpen(false)}
            >
              <button
                type="button"
                onFocus={() => setProductsOpen(true)}
                onClick={() => setProductsOpen((prev) => !prev)}
                className="nav-link flex items-center gap-2 text-sm font-medium text-slate-200"
              >
                Product
                <span className="text-xs text-slate-400">▼</span>
              </button>

              <AnimatePresence>
                {productsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.98 }}
                    transition={getFramerTransition({
                      duration: motionTokens.duration.quick,
                    })}
                    className="enterprise-glass absolute right-0 top-10 w-[340px] rounded-xl border border-white/16 p-4"
                  >
                    <DropdownGroup title="Business">
                      {productGroups.business.map((product) => (
                        <DropdownLink
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          onSelect={() => setProductsOpen(false)}
                        >
                          {product.name}
                        </DropdownLink>
                      ))}
                    </DropdownGroup>

                    <DropdownGroup title="Build for Users (Free)">
                      {productGroups.users.map((product) => (
                        <DropdownLink
                          key={product.slug}
                          href={`/products/${product.slug}`}
                          onSelect={() => setProductsOpen(false)}
                        >
                          {product.name}
                        </DropdownLink>
                      ))}
                    </DropdownGroup>

                    <div className="mt-3 border-t border-white/10 pt-3">
                      <Link
                        href="/products"
                        onClick={() => setProductsOpen(false)}
                        className="text-xs font-medium uppercase tracking-[0.14em] text-indigo-200 transition-colors duration-300 hover:text-indigo-100"
                      >
                        View all products
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </nav>

          <Link
            href={isProductsActive ? "/#connect" : "#connect"}
            className="hidden rounded-full border border-indigo-300/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200/50 hover:bg-indigo-500/20 md:inline-flex"
          >
            Connect
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden rounded-lg border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-200"
          >
            Menu
          </button>
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
              className="mt-3 rounded-xl border border-white/12 bg-slate-900/70 p-4 md:hidden"
            >
              <div className="space-y-3">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-slate-200"
                >
                  Home
                </Link>
                <Link
                  href="/#connect"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-slate-200"
                >
                  Connect
                </Link>
                <Link
                  href="/#about"
                  onClick={() => setMobileOpen(false)}
                  className="block text-sm text-slate-200"
                >
                  About
                </Link>
              </div>

              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Product
                </p>
                <div className="mt-2 space-y-1">
                  {productGroups.business.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/products/${product.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-white/5"
                    >
                      {product.name}
                    </Link>
                  ))}
                </div>
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Build for Users (Free)
                </p>
                <div className="mt-2 space-y-1">
                  {productGroups.users.map((product) => (
                    <Link
                      key={product.slug}
                      href={`/products/${product.slug}`}
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-md px-2 py-2 text-sm text-slate-300 hover:bg-white/5"
                    >
                      {product.name}
                    </Link>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
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
      className={`nav-link relative text-sm font-medium transition-colors duration-300 ${
        active ? "text-slate-100" : "text-slate-300 hover:text-slate-100"
      }`}
    >
      {children}
      <span
        className={`absolute -bottom-1 left-0 h-px w-full origin-left bg-gradient-to-r from-transparent via-indigo-300 to-transparent transition-transform duration-300 ${
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
    <div className="mb-3 rounded-lg border border-white/8 bg-slate-950/35 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

type DropdownLinkProps = {
  href: string;
  children: React.ReactNode;
  onSelect: () => void;
};

function DropdownLink({ href, children, onSelect }: DropdownLinkProps) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="block rounded-md px-2 py-2 text-sm text-slate-300 transition-all duration-300 hover:translate-x-1 hover:bg-white/5 hover:text-slate-100"
    >
      {children}
    </Link>
  );
}
