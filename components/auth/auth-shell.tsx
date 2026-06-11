import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb left-[15%] top-[20%] h-72 w-72 bg-purple-600/25" />
        <div
          className="orb right-[12%] bottom-[25%] h-64 w-64 bg-cyan-500/20"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="gradient-text text-sm font-bold uppercase tracking-[0.2em]">
              SAI COMPANY
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-white/60">{subtitle}</p>
        </div>

        <div className="enterprise-glass rounded-2xl border border-white/10 p-8">
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-xs text-white/40">{footer}</div>}
      </div>
    </div>
  );
}
