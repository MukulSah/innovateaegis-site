"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";

/**
 * router.refresh() re-fetches the full RSC tree — expensive on heavy pages.
 * Debounce and swallow transient failures when refreshes overlap.
 */
export function useDebouncedRouterRefresh(cooldownMs = 20_000) {
  const router = useRouter();
  const lastAtRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(() => {
    const run = () => {
      lastAtRef.current = Date.now();
      try {
        router.refresh();
      } catch {
        // Refresh races are common when many listeners fire in dev.
      }
    };

    const elapsed = Date.now() - lastAtRef.current;
    if (elapsed >= cooldownMs) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      run();
      return;
    }

    if (timerRef.current) return;

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      run();
    }, cooldownMs - elapsed);
  }, [router, cooldownMs]);
}
