"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/sai";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/sai/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb left-[15%] top-[20%] h-72 w-72 bg-purple-600/25" />
        <div className="orb right-[12%] bottom-[25%] h-64 w-64 bg-cyan-500/20" style={{ animationDelay: "1.5s" }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <span className="gradient-text text-sm font-bold uppercase tracking-[0.2em]">
              SAI COMPANY
            </span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-white md:text-3xl">
            Enter Headquarters
          </h1>
          <p className="mt-2 text-sm text-white/60">
            The Operating System That Runs a Company
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="enterprise-glass rounded-2xl border border-white/10 p-8"
        >
          <div className="space-y-5">
            <div>
              <label htmlFor="username" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/40 focus:bg-white/[0.07]"
                placeholder="Enter username"
                autoComplete="username"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-white/50">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-purple-400/40 focus:bg-white/[0.07]"
                placeholder="Enter password"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="glow-btn w-full rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Entering..." : "Enter SAI COMPANY"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          <Link href="/" className="transition-colors hover:text-white/60">
            ← Back to public site
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-white/50">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
