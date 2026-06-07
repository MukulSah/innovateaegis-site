"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/sai/auth";

export default function LoginPage() {
  const router = useRouter();
  const { user, ready, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/os");
  }, [ready, user, router]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const ok = login(username, password);
    if (ok) {
      router.replace("/os");
    } else {
      setError("Invalid credentials. Try admin / admin.");
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb left-[12%] top-[18%] h-72 w-72 bg-purple-600/25" />
        <div className="orb right-[10%] bottom-[12%] h-64 w-64 bg-cyan-500/20" style={{ animationDelay: "1.4s" }} />
      </div>

      <div className="relative w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-white/80"
        >
          ← Back to website
        </Link>

        <div className="enterprise-glass rounded-3xl border border-white/10 p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">
            SAI COMPANY
          </p>
          <h1 className="gradient-text mt-3 text-3xl font-bold tracking-tight">
            Enter the company OS
          </h1>
          <p className="mt-2 text-sm leading-7 text-white/60">
            Log in to the operating system that runs the company. This is the
            headquarters where founders, employees, and AI agents collaborate.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/50">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/50 focus:bg-white/[0.06]"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-white/50">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/50 focus:bg-white/[0.06]"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="glow-btn w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {submitting ? "Entering…" : "Enter SAI COMPANY"}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-6 text-white/50">
            <p className="font-semibold text-white/70">Demo credentials</p>
            <p>
              Owner — <span className="text-purple-200">admin</span> /{" "}
              <span className="text-purple-200">admin</span>
            </p>
            <p>
              Employee — first name (e.g. <span className="text-cyan-200">aarav</span>) /{" "}
              <span className="text-cyan-200">demo</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
