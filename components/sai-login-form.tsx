"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const SAI_SESSION_KEY = "sai-company-session";

export function SaiLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (username.trim() !== "admin" || password !== "admin") {
      setError("Use the default owner credentials: admin / admin.");
      return;
    }

    window.localStorage.setItem(
      SAI_SESSION_KEY,
      JSON.stringify({
        username: "admin",
        role: "Owner",
        loggedInAt: new Date().toISOString(),
      }),
    );

    router.push("/sai-company");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
          Admin username
        </label>
        <input
          id="username"
          name="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/50"
          placeholder="admin"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
          Admin password
        </label>
        <input
          id="password"
          name="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          type="password"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-cyan-300/50"
          placeholder="admin"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="glow-btn w-full rounded-2xl bg-gradient-to-r from-purple-600 via-cyan-500 to-blue-500 px-5 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white"
      >
        Enter SAI COMPANY
      </button>
    </form>
  );
}

export { SAI_SESSION_KEY };
