import Link from "next/link";
import type { HealthStatus } from "@/lib/sai/types";

export const healthColor: Record<HealthStatus, string> = {
  green: "text-emerald-300",
  yellow: "text-amber-300",
  red: "text-rose-300",
};

export const healthDot: Record<HealthStatus, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-rose-400",
};

export const healthBorder: Record<HealthStatus, string> = {
  green: "border-emerald-400/30",
  yellow: "border-amber-400/30",
  red: "border-rose-400/30",
};

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`enterprise-glass rounded-2xl border border-white/10 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          {eyebrow}
        </p>
      )}
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-white md:text-3xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">{description}</p>
      )}
    </div>
  );
}

export function StatPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
      {children}
    </span>
  );
}

export function HealthBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${healthBorder[status]} ${healthColor[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${healthDot[status]}`} />
      {status}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function Avatar({ initials }: { initials: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/60 to-cyan-500/60 text-xs font-bold text-white">
      {initials}
    </span>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-5 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-white/80"
    >
      ← {children}
    </Link>
  );
}
