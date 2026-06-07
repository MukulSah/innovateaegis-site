"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { SAI_SESSION_KEY } from "@/components/sai-login-form";

type SaiAuthGateProps = {
  children: React.ReactNode;
};

export function SaiAuthGate({ children }: SaiAuthGateProps) {
  const router = useRouter();
  const hasSession = useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot);

  useEffect(() => {
    if (!hasSession) {
      router.replace("/login");
    }
  }, [hasSession, router]);

  if (!hasSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="enterprise-glass rounded-3xl border border-white/10 p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">SAI COMPANY</p>
          <p className="mt-3 text-sm text-white/60">Opening company headquarters...</p>
        </div>
      </main>
    );
  }

  return children;
}

export function SaiLogoutButton() {
  const router = useRouter();

  function handleLogout() {
    window.localStorage.removeItem(SAI_SESSION_KEY);
    router.push("/login");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
    >
      Logout
    </button>
  );
}

function subscribeToSession(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);

  return () => window.removeEventListener("storage", onStoreChange);
}

function getSessionSnapshot() {
  return Boolean(window.localStorage.getItem(SAI_SESSION_KEY));
}

function getServerSessionSnapshot() {
  return false;
}
