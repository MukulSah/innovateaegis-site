"use client";

import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let x = 0;
    let y = 0;
    let currentX = 0;
    let currentY = 0;
    let rafId: number;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
    };

    const animate = () => {
      currentX += (x - currentX) * 0.15;
      currentY += (y - currentY) * 0.15;
      glow.style.left = `${currentX}px`;
      glow.style.top = `${currentY}px`;
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <div ref={glowRef} className="cursor-glow hidden md:block" />
      <div className="noise-overlay" />
    </>
  );
}
