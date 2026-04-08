import type { Transition } from "framer-motion";

export const motionTokens = {
  duration: {
    quick: 0.2,
    standard: 0.28,
    emphasis: 0.34,
    max: 0.4,
  },
  ease: {
    standard: "easeInOut" as const,
    gsapStandard: "power2.inOut",
    gsapSnap: "power3.out",
    gsapSmooth: "power1.inOut",
  },
  stagger: {
    tight: 0.04,
    standard: 0.05,
    relaxed: 0.08,
  },
  scroll: {
    revealStart: "top 85%",
  },
} as const;

type TransitionOptions = {
  delay?: number;
  duration?: number;
};

export function getFramerTransition(
  options: TransitionOptions = {},
): Transition {
  return {
    duration: options.duration ?? motionTokens.duration.standard,
    delay: options.delay,
    ease: motionTokens.ease.standard,
  };
}

/* ── Product-specific Framer Motion variants ── */

export const sentraVariants = {
  nodeEnter: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
  },
  connectionPulse: {
    hidden: { opacity: 0, pathLength: 0 },
    visible: { opacity: 0.7, pathLength: 1 },
  },
  bootLine: {
    hidden: { opacity: 0, x: -12 },
    visible: { opacity: 1, x: 0 },
  },
  gridReveal: {
    hidden: { opacity: 0, y: 20, scale: 0.97 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
};

export const facenovaVariants = {
  scanReveal: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  },
  detectBox: {
    hidden: { opacity: 0, scale: 1.3 },
    visible: { opacity: 1, scale: 1 },
  },
  pipelineStep: {
    hidden: { opacity: 0, y: 24, scale: 0.92 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  trackingDot: {
    hidden: { opacity: 0, scale: 0.5 },
    visible: { opacity: 1, scale: 1 },
  },
};

export const hygyrVariants = {
  softFade: {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0 },
  },
  formField: {
    hidden: { opacity: 0, y: 8, scale: 0.99 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  previewLine: {
    hidden: { opacity: 0, scaleX: 0.3 },
    visible: { opacity: 1, scaleX: 1 },
  },
};

export const parkingVariants = {
  mapZoom: {
    hidden: { opacity: 0, scale: 1.15 },
    visible: { opacity: 1, scale: 1 },
  },
  pinDrop: {
    hidden: { opacity: 0, y: -20, scale: 0.6 },
    visible: { opacity: 1, y: 0, scale: 1 },
  },
  spotReveal: {
    hidden: { opacity: 0, y: 16, x: 8 },
    visible: { opacity: 1, y: 0, x: 0 },
  },
  pathDraw: {
    hidden: { pathLength: 0, opacity: 0 },
    visible: { pathLength: 1, opacity: 1 },
  },
};
