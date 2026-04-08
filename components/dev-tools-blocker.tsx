"use client";

import { useEffect } from "react";

export function DevToolsBlocker() {
  useEffect(() => {
    const blockKeys = (e: KeyboardEvent) => {
      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }
      // Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) {
        e.preventDefault();
        return;
      }
      // Ctrl+U (view source)
      if (e.ctrlKey && e.key === "u") {
        e.preventDefault();
        return;
      }
    };

    const blockContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockContextMenu);

    // Clear console periodically
    const interval = setInterval(() => {
      console.clear();
    }, 2000);

    return () => {
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockContextMenu);
      clearInterval(interval);
    };
  }, []);

  return null;
}
