"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  getFramerTransition,
  motionTokens,
  sentraVariants,
  facenovaVariants,
  hygyrVariants,
  parkingVariants,
} from "@/lib/motion";
import type { Product } from "@/lib/products";

gsap.registerPlugin(ScrollTrigger);

type ProductDetailProps = {
  product: Product;
};

export function ProductDetail({ product }: ProductDetailProps) {
  if (product.slug === "sentra") return <SentraExperience product={product} />;
  if (product.slug === "facenova") return <FacenovaExperience product={product} />;
  if (product.slug === "hygyr") return <HygyrExperience product={product} />;
  return <SmartParkingExperience product={product} />;
}

/* ════════════════════════════════════════════════════════════════════════════
   SENTRA — COMMAND CENTER
   Network nodes connecting, grid overlays, data streams, system boot
   ════════════════════════════════════════════════════════════════════════ */

const SENTRA_NODES = [
  { id: "gateway", label: "Gateway", x: 50, y: 20 },
  { id: "policy", label: "Policy Engine", x: 20, y: 45 },
  { id: "devices", label: "Endpoints", x: 80, y: 45 },
  { id: "signals", label: "Signals", x: 35, y: 75 },
  { id: "alerts", label: "Alerts", x: 65, y: 75 },
  { id: "control", label: "Control", x: 50, y: 95 },
];

const SENTRA_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4], [1, 2], [3, 5], [4, 5], [3, 4],
];

function SentraExperience({ product }: ProductDetailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [bootComplete, setBootComplete] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setBootComplete(true), 1800);

    const ctx = gsap.context(() => {
      // Data stream lines
      gsap.utils.toArray<HTMLElement>(".sentra-stream-line").forEach((el, i) => {
        gsap.fromTo(el,
          { xPercent: -120, opacity: 0 },
          { xPercent: 400, opacity: 0.6, duration: 2.8 + i * 0.4, repeat: -1, ease: "none", delay: i * 0.6 }
        );
      });

      // Scroll reveals
      gsap.utils.toArray<HTMLElement>(".sentra-scroll").forEach((node, i) => {
        gsap.fromTo(node,
          { opacity: 0, y: 22, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1,
            duration: motionTokens.duration.emphasis,
            delay: i * motionTokens.stagger.tight,
            ease: motionTokens.ease.gsapStandard,
            scrollTrigger: { trigger: node, start: motionTokens.scroll.revealStart },
          }
        );
      });

      // Node pulse indicators
      gsap.utils.toArray<HTMLElement>(".sentra-indicator").forEach((dot, i) => {
        gsap.fromTo(dot,
          { scale: 0.8, opacity: 0.3 },
          { scale: 1.2, opacity: 0.9, duration: 1.2, repeat: -1, yoyo: true, delay: i * 0.3, ease: motionTokens.ease.gsapSmooth }
        );
      });
    }, rootRef);

    return () => { window.clearTimeout(timer); ctx.revert(); };
  }, []);

  const bootSequence = [
    { text: "Initializing core runtime...", delay: 0 },
    { text: "Connecting endpoint mesh...", delay: 0.3 },
    { text: "Synchronizing policy engine...", delay: 0.6 },
    { text: "Activating command stream...", delay: 0.9 },
    { text: "System online.", delay: 1.2 },
  ];

  return (
    <div ref={rootRef}>
      <main className="relative overflow-hidden px-6 pb-16 pt-32 md:px-10 md:pt-40">
        {/* Hero — System Boot */}
        <section className="mx-auto w-full max-w-6xl">
          <div className="enterprise-glass relative overflow-hidden rounded-3xl border border-blue-400/20 p-8 md:p-12">
            {/* Grid overlay */}
            <div className="sentra-grid-bg pointer-events-none absolute inset-0" />

            {/* Data streams */}
            {[18, 36, 54, 72].map((top, i) => (
              <div key={i} className="sentra-stream-line absolute h-px w-20 bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" style={{ top: `${top}%` }} />
            ))}

            <div className="relative">
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={getFramerTransition({ delay: 0.1 })}
                className="font-mono text-xs uppercase tracking-[0.2em] text-blue-300/80"
              >
                System initialization
              </motion.p>

              <motion.h1
                variants={sentraVariants.gridReveal}
                initial="hidden"
                animate="visible"
                transition={getFramerTransition({ duration: motionTokens.duration.emphasis, delay: 0.15 })}
                className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl"
              >
                {product.name}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getFramerTransition({ delay: 0.25, duration: motionTokens.duration.emphasis })}
                className="mt-4 max-w-2xl text-lg text-blue-100/85"
              >
                {product.tagline}
              </motion.p>

              {/* Boot sequence terminal */}
              <div className="mt-8 overflow-hidden rounded-xl border border-blue-300/15 bg-slate-950/80 p-5 font-mono text-sm">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-300/40" />
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-200/25" />
                  <span className="ml-3 text-xs text-blue-300/60">sentra-core v3.2</span>
                </div>
                {bootSequence.map((line, i) => (
                  <motion.div
                    key={i}
                    variants={sentraVariants.bootLine}
                    initial="hidden"
                    animate="visible"
                    transition={getFramerTransition({ delay: line.delay, duration: motionTokens.duration.quick })}
                    className="flex items-center gap-2 py-1"
                  >
                    <span className="text-blue-400/60">▸</span>
                    <span className={i === bootSequence.length - 1 ? "text-blue-200 font-semibold" : "text-slate-400"}>
                      {line.text}
                    </span>
                    {i < bootSequence.length - 1 && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: line.delay + 0.2 }}
                        className="sentra-indicator ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"
                      />
                    )}
                  </motion.div>
                ))}
                {bootComplete && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={getFramerTransition({ duration: motionTokens.duration.quick })}
                    className="mt-2 border-t border-blue-300/10 pt-2 text-xs text-blue-200/60"
                  >
                    All subsystems operational · Latency: 2ms · Nodes: 6
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Network Topology Visualization */}
        <section className="sentra-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">System topology</p>
          <div className="mt-4 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="relative overflow-hidden rounded-2xl border border-blue-300/15 bg-slate-950/70 p-6">
              <svg viewBox="0 0 100 110" className="h-full w-full" style={{ minHeight: 280 }}>
                {/* Connection lines */}
                {SENTRA_CONNECTIONS.map(([from, to], i) => (
                  <motion.line
                    key={i}
                    x1={SENTRA_NODES[from].x}
                    y1={SENTRA_NODES[from].y}
                    x2={SENTRA_NODES[to].x}
                    y2={SENTRA_NODES[to].y}
                    stroke="rgba(59,130,246,0.25)"
                    strokeWidth="0.4"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: activeNode ? (activeNode === SENTRA_NODES[from].id || activeNode === SENTRA_NODES[to].id ? 0.8 : 0.15) : 0.4 }}
                    transition={{ duration: motionTokens.duration.emphasis, delay: i * 0.08 }}
                  />
                ))}
                {/* Nodes */}
                {SENTRA_NODES.map((node, i) => (
                  <g key={node.id}>
                    <motion.circle
                      cx={node.x} cy={node.y} r={activeNode === node.id ? 4 : 3}
                      fill={activeNode === node.id ? "#3b82f6" : "rgba(59,130,246,0.5)"}
                      variants={sentraVariants.nodeEnter}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: 0.4 + i * 0.1, duration: motionTokens.duration.standard }}
                      onMouseEnter={() => setActiveNode(node.id)}
                      onMouseLeave={() => setActiveNode(null)}
                      className="cursor-pointer"
                    />
                    {activeNode === node.id && (
                      <motion.circle
                        cx={node.x} cy={node.y} r={7}
                        fill="none" stroke="#3b82f6" strokeWidth="0.3"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 0.6 }}
                        transition={{ duration: motionTokens.duration.quick }}
                      />
                    )}
                    <text
                      x={node.x} y={node.y - 6}
                      textAnchor="middle"
                      className="fill-slate-400 text-[3px] font-medium"
                    >
                      {node.label}
                    </text>
                  </g>
                ))}
              </svg>
              <p className="mt-3 text-xs text-slate-500">Hover nodes to simulate activation and control focus.</p>
            </div>

            <div>
              <p className="text-sm leading-7 text-slate-300">{product.description}</p>
              <ul className="mt-5 space-y-3 text-sm text-slate-200">
                {product.whatItDoes.map((point, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400/70" />
                    {point}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Visual — Dashboard Mock */}
        <section className="sentra-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200/80">Control surface</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-blue-300/15 bg-slate-950/60 p-6">
            <div className="grid grid-cols-4 gap-3">
              {["Endpoints", "Active", "Alerts", "Policies"].map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={getFramerTransition({ delay: i * motionTokens.stagger.standard })}
                  className="rounded-lg border border-blue-200/12 bg-slate-900/50 p-4 text-center"
                >
                  <p className="text-2xl font-semibold text-blue-100">{[248, 192, 3, 12][i]}</p>
                  <p className="mt-1 text-xs text-slate-400">{label}</p>
                </motion.div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
              <span className="text-xs text-blue-300/60 font-mono">LIVE</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
            </div>
            <div className="mt-4 grid grid-cols-6 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-8 rounded border border-blue-200/8 bg-slate-900/40">
                  <motion.div
                    className="h-full rounded bg-blue-500/20"
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: Math.random() * 0.6 + 0.2 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: motionTokens.duration.emphasis }}
                    style={{ transformOrigin: "left" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="sentra-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Key features</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 18, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={getFramerTransition({ delay: i * motionTokens.stagger.standard })}
                whileHover={{ y: -3, transition: { duration: motionTokens.duration.quick } }}
                className="group enterprise-glass rounded-2xl border border-blue-200/12 p-5 transition-colors hover:border-blue-300/25"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 transition-colors group-hover:bg-blue-500/35">
                  <div className="sentra-indicator h-2.5 w-2.5 rounded-full bg-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-16 w-full max-w-6xl">
          <div className="enterprise-glass rounded-2xl border border-blue-300/15 p-8 text-center">
            <p className="text-sm text-slate-300">Command systems with confidence and operational discipline.</p>
            <button
              type="button"
              className="mt-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {product.ctaLabel}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   FACENOVA — AI SURVEILLANCE INTELLIGENCE
   Camera scan, face detection boxes, tracking motion, pipeline stages
   ════════════════════════════════════════════════════════════════════════ */

function FacenovaExperience({ product }: ProductDetailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [detectedCount, setDetectedCount] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setDetectedCount((prev) => (prev < 3 ? prev + 1 : prev));
    }, 800);

    const ctx = gsap.context(() => {
      // Alternating left/right reveals for sections
      gsap.utils.toArray<HTMLElement>(".facenova-scroll").forEach((node, i) => {
        gsap.fromTo(node,
          { opacity: 0, x: i % 2 === 0 ? -20 : 20 },
          {
            opacity: 1, x: 0,
            duration: motionTokens.duration.emphasis,
            ease: motionTokens.ease.gsapStandard,
            scrollTrigger: { trigger: node, start: motionTokens.scroll.revealStart },
          }
        );
      });
    }, rootRef);

    return () => { window.clearInterval(interval); ctx.revert(); };
  }, []);

  const detectionTargets = [
    { left: "22%", top: "28%", w: 52, h: 64, label: "ID-001", confidence: "98.2%" },
    { left: "52%", top: "35%", w: 44, h: 56, label: "ID-002", confidence: "96.7%" },
    { left: "76%", top: "24%", w: 48, h: 60, label: "ID-003", confidence: "97.9%" },
  ];

  return (
    <div ref={rootRef}>
      <main className="relative overflow-hidden px-6 pb-16 pt-32 md:px-10 md:pt-40">
        {/* Hero — Camera Scan Reveal */}
        <section className="mx-auto w-full max-w-6xl">
          <div className="enterprise-glass relative overflow-hidden rounded-3xl border border-cyan-300/15 p-8 md:p-12">
            {/* Scan line */}
            <div className="facenova-scanline pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-cyan-300/25 to-transparent" />
            {/* Grid overlay */}
            <div className="facenova-grid-bg pointer-events-none absolute inset-0" />

            <div className="relative z-20">
              <div className="flex items-center gap-3">
                <span className="facenova-indicator h-2 w-2 rounded-full bg-cyan-400" />
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/70">Camera feed active</span>
              </div>

              <motion.h1
                variants={facenovaVariants.scanReveal}
                initial="hidden"
                animate="visible"
                transition={getFramerTransition({ duration: motionTokens.duration.emphasis, delay: 0.15 })}
                className="mt-4 text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl"
              >
                {product.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={getFramerTransition({ delay: 0.25 })}
                className="mt-4 max-w-2xl text-lg text-cyan-100/85"
              >
                {product.tagline}
              </motion.p>
            </div>

            {/* Detection viewport */}
            <div className="relative mt-8 min-h-72 overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/80">
              {/* Camera corner overlays */}
              <div className="pointer-events-none absolute inset-3 z-30">
                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-cyan-300/60" />
                <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-cyan-300/60" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-cyan-300/60" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-cyan-300/60" />
              </div>

              {/* HUD text */}
              <div className="absolute left-5 top-5 z-30 font-mono text-[10px] text-cyan-300/50">
                <p>RES: 1920×1080</p>
                <p>FPS: 60</p>
                <p>MODE: IDENTIFY</p>
              </div>
              <div className="absolute right-5 top-5 z-30 font-mono text-[10px] text-cyan-300/50 text-right">
                <p>SUBJECTS: {detectedCount}/3</p>
                <p>CONFIDENCE: HIGH</p>
              </div>

              {/* Detection boxes */}
              {detectionTargets.map((target, i) => (
                <motion.div
                  key={target.label}
                  variants={facenovaVariants.detectBox}
                  initial="hidden"
                  animate={detectedCount > i ? "visible" : "hidden"}
                  transition={getFramerTransition({ duration: motionTokens.duration.standard, delay: i * 0.15 })}
                  className="absolute z-20"
                  style={{ left: target.left, top: target.top, width: target.w, height: target.h }}
                >
                  <div className="h-full w-full border border-cyan-400/70">
                    <div className="absolute -top-5 left-0 font-mono text-[9px] text-cyan-300">
                      {target.label} · {target.confidence}
                    </div>
                    {/* Corner ticks */}
                    <div className="absolute -left-1 -top-1 h-2 w-2 border-l border-t border-cyan-400" />
                    <div className="absolute -right-1 -top-1 h-2 w-2 border-r border-t border-cyan-400" />
                    <div className="absolute -bottom-1 -left-1 h-2 w-2 border-b border-l border-cyan-400" />
                    <div className="absolute -bottom-1 -right-1 h-2 w-2 border-b border-r border-cyan-400" />
                  </div>
                </motion.div>
              ))}

              {/* Tracking dot */}
              <motion.div
                animate={{ x: [-80, 80, -80], y: [-20, 30, -20] }}
                transition={{ duration: 4, ease: "easeInOut", repeat: Infinity }}
                className="absolute left-1/2 top-1/2 z-10"
              >
                <div className="h-3 w-3 rounded-full border border-cyan-300/70 bg-cyan-400/30" />
              </motion.div>

              {/* Ambient grid inside viewport */}
              <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(34,211,238,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.15)_1px,transparent_1px)] [background-size:24px_24px]" />
            </div>
          </div>
        </section>

        {/* Pipeline: Detect → Track → Identify */}
        <section className="facenova-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Recognition pipeline</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { stage: "Detect", desc: product.whatItDoes[0], icon: "◎" },
              { stage: "Track", desc: product.whatItDoes[1], icon: "⊕" },
              { stage: "Identify", desc: product.whatItDoes[2], icon: "◈" },
            ].map((step, i) => (
              <motion.div
                key={step.stage}
                variants={facenovaVariants.pipelineStep}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={getFramerTransition({ duration: motionTokens.duration.emphasis, delay: i * 0.12 })}
                className="group relative overflow-hidden rounded-2xl border border-cyan-200/15 bg-slate-950/65 p-6"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-cyan-400/80">{step.icon}</span>
                  <div>
                    <p className="font-mono text-xs uppercase tracking-[0.16em] text-cyan-300/70">Stage 0{i + 1}</p>
                    <h3 className="text-2xl font-semibold text-slate-100">{step.stage}</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-300">{step.desc}</p>
                {i < 2 && (
                  <div className="absolute -right-3 top-1/2 hidden text-cyan-400/40 md:block">→</div>
                )}
              </motion.div>
            ))}
          </div>
          {product.whatItDoes[3] && (
            <p className="mt-4 text-sm text-slate-400">• {product.whatItDoes[3]}</p>
          )}
        </section>

        {/* Visual — Surveillance Dashboard Mock */}
        <section className="facenova-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200/80">Monitoring interface</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              { label: "Active Cameras", value: "24", sub: "All zones" },
              { label: "Detections Today", value: "1,847", sub: "↑ 12% vs yesterday" },
              { label: "Avg Confidence", value: "97.4%", sub: "Above threshold" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                className="rounded-xl border border-cyan-200/12 bg-slate-950/60 p-5"
              >
                <p className="text-3xl font-semibold text-cyan-100">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-300">{stat.label}</p>
                <p className="mt-1 text-xs text-slate-500">{stat.sub}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="facenova-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Key features</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                className="group enterprise-glass rounded-2xl border border-cyan-200/10 p-5 transition-colors hover:border-cyan-300/20"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/15 transition-colors group-hover:bg-cyan-500/30">
                  <span className="facenova-indicator h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-16 w-full max-w-6xl">
          <div className="enterprise-glass rounded-2xl border border-cyan-300/12 p-8 text-center">
            <p className="text-sm text-slate-300">Build monitoring systems that are precise, aware, and audit ready.</p>
            <button
              type="button"
              className="mt-5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-7 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {product.ctaLabel}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   HYGYR — CLEAN USER TOOL
   Soft fades, form-building progressive reveal, resume preview forming
   ════════════════════════════════════════════════════════════════════════ */

function HygyrExperience({ product }: ProductDetailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [buildStep, setBuildStep] = useState(0);
  const maxSteps = 4;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBuildStep((prev) => (prev >= maxSteps ? maxSteps : prev + 1));
    }, 600);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".hygyr-scroll").forEach((node) => {
        gsap.fromTo(node,
          { opacity: 0, y: 14 },
          {
            opacity: 1, y: 0,
            duration: motionTokens.duration.emphasis,
            ease: motionTokens.ease.gsapSmooth,
            scrollTrigger: { trigger: node, start: motionTokens.scroll.revealStart },
          }
        );
      });
    }, rootRef);

    return () => { window.clearInterval(interval); ctx.revert(); };
  }, []);

  const resumeSections = [
    { label: "Personal Info", icon: "◯" },
    { label: "Experience", icon: "◎" },
    { label: "Skills", icon: "◈" },
    { label: "Projects", icon: "◇" },
  ];

  const previewLines = [
    { w: "60%", h: "h-4" },
    { w: "40%", h: "h-2.5" },
    { w: "90%", h: "h-2" },
    { w: "85%", h: "h-2" },
    { w: "70%", h: "h-2" },
    { w: "95%", h: "h-2" },
    { w: "50%", h: "h-2" },
    { w: "80%", h: "h-2" },
  ];

  return (
    <div ref={rootRef}>
      <main className="relative overflow-hidden px-6 pb-16 pt-32 md:px-10 md:pt-40">
        {/* Hero — Resume Builds Itself */}
        <section className="mx-auto w-full max-w-6xl">
          <div className="enterprise-glass relative rounded-3xl border border-indigo-200/15 p-8 md:p-12">
            <motion.h1
              variants={hygyrVariants.softFade}
              initial="hidden"
              animate="visible"
              transition={getFramerTransition({ duration: motionTokens.duration.emphasis })}
              className="text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl"
            >
              {product.name}
            </motion.h1>
            <motion.p
              variants={hygyrVariants.softFade}
              initial="hidden"
              animate="visible"
              transition={getFramerTransition({ delay: 0.1, duration: motionTokens.duration.emphasis })}
              className="mt-4 max-w-2xl text-lg text-indigo-100/85"
            >
              {product.tagline}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={getFramerTransition({ delay: 0.2 })}
              className="mt-3 inline-block rounded-full border border-indigo-300/20 bg-indigo-500/10 px-4 py-1.5 text-sm font-medium text-indigo-200"
            >
              No paywalls. No hidden charges.
            </motion.p>

            {/* Builder + Preview side by side */}
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {/* Builder panel */}
              <div className="rounded-2xl border border-indigo-200/15 bg-slate-950/60 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-indigo-200/70">Resume builder</p>
                <div className="mt-4 space-y-3">
                  {resumeSections.map((section, i) => (
                    <motion.div
                      key={section.label}
                      variants={hygyrVariants.formField}
                      initial="hidden"
                      animate={buildStep >= i ? "visible" : "hidden"}
                      transition={getFramerTransition({ duration: motionTokens.duration.standard, delay: i * 0.05 })}
                      className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm transition-colors duration-300 ${
                        buildStep >= i
                          ? "border border-indigo-300/20 bg-slate-900/70 text-slate-100"
                          : "border border-transparent bg-slate-900/30 text-slate-500"
                      }`}
                    >
                      <span className="text-indigo-400/70">{section.icon}</span>
                      <span>{section.label}</span>
                      {buildStep >= i && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="ml-auto text-xs text-indigo-400"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.div>
                  ))}
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: buildStep >= maxSteps ? 1 : 0 }}
                  className="mt-4 rounded-lg bg-indigo-500/15 px-3 py-2 text-center text-xs font-medium text-indigo-200"
                >
                  Resume ready for export
                </motion.div>
              </div>

              {/* Preview panel */}
              <div className="relative overflow-hidden rounded-2xl border border-indigo-200/15 bg-white/95 p-6 text-slate-900">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Live preview</p>
                <div className="mt-4 space-y-2.5">
                  {previewLines.map((line, i) => (
                    <motion.div
                      key={i}
                      variants={hygyrVariants.previewLine}
                      initial="hidden"
                      animate={buildStep >= Math.floor(i / 2) ? "visible" : "hidden"}
                      transition={getFramerTransition({ delay: i * 0.04, duration: motionTokens.duration.standard })}
                      className={`${line.h} rounded bg-slate-200`}
                      style={{ width: line.w, transformOrigin: "left" }}
                    />
                  ))}
                </div>
                {buildStep < maxSteps && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                    <p className="text-xs text-slate-400">Building...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* What It Does */}
        <section className="hygyr-scroll mx-auto mt-16 grid w-full max-w-6xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-indigo-200/12 bg-slate-900/50 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-indigo-200/80">What it does</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{product.description}</p>
          </div>
          <div className="rounded-2xl border border-indigo-200/12 bg-slate-900/50 p-6">
            <p className="text-xs uppercase tracking-[0.16em] text-indigo-200/80">Progressive guidance</p>
            <ul className="mt-4 space-y-3 text-sm text-slate-300">
              {product.whatItDoes.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                  className="flex items-start gap-2"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400/60" />
                  {point}
                </motion.li>
              ))}
            </ul>
          </div>
        </section>

        {/* Visual — Form Building Experience */}
        <section className="hygyr-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200/80">Editor experience</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-200/12 bg-slate-950/50 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              {["Write", "Format", "Export"].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={getFramerTransition({ delay: i * 0.1 })}
                  className="rounded-xl border border-indigo-200/10 bg-slate-900/40 p-4 text-center"
                >
                  <p className="text-xs text-indigo-300/60 uppercase tracking-wider">Step {i + 1}</p>
                  <p className="mt-2 text-lg font-semibold text-slate-100">{step}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="hygyr-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Key features</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                className="enterprise-glass rounded-2xl border border-indigo-200/10 p-5 transition-colors hover:border-indigo-300/18"
              >
                <div className="mb-4 h-9 w-9 rounded-lg bg-indigo-500/15" />
                <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-16 w-full max-w-6xl">
          <div className="enterprise-glass rounded-2xl border border-indigo-200/12 p-8 text-center">
            <p className="text-sm text-slate-300">Create better resumes with less friction and full transparency.</p>
            <button
              type="button"
              className="mt-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 px-7 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {product.ctaLabel}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   SMART PARKING — REAL-TIME NAVIGATION
   Map zoom, pin drops, path drawing, availability signals
   ════════════════════════════════════════════════════════════════════════ */

function SmartParkingExperience({ product }: ProductDetailProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pinsDropped, setPinsDropped] = useState(0);

  const parkingSpots = [
    { name: "Downtown Deck", spots: 12, status: "available" as const, x: 25, y: 35 },
    { name: "City Center", spots: 4, status: "limited" as const, x: 55, y: 28 },
    { name: "Riverside Plaza", spots: 18, status: "available" as const, x: 75, y: 50 },
    { name: "Main Street", spots: 2, status: "limited" as const, x: 40, y: 65 },
  ];

  useEffect(() => {
    const timers = parkingSpots.map((_, i) =>
      window.setTimeout(() => setPinsDropped((prev) => prev + 1), 400 + i * 350)
    );

    const ctx = gsap.context(() => {
      // Path draw animation
      gsap.fromTo(".parking-svg-path",
        { strokeDashoffset: 600 },
        { strokeDashoffset: 0, duration: 1.2, ease: motionTokens.ease.gsapSmooth, delay: 0.5 }
      );

      // Scroll reveals
      gsap.utils.toArray<HTMLElement>(".parking-scroll").forEach((node) => {
        gsap.fromTo(node,
          { opacity: 0, y: 16, x: 6 },
          {
            opacity: 1, y: 0, x: 0,
            duration: motionTokens.duration.standard,
            ease: motionTokens.ease.gsapSnap,
            scrollTrigger: { trigger: node, start: motionTokens.scroll.revealStart },
          }
        );
      });
    }, rootRef);

    return () => { timers.forEach((t) => window.clearTimeout(t)); ctx.revert(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={rootRef}>
      <main className="relative overflow-hidden px-6 pb-16 pt-32 md:px-10 md:pt-40">
        {/* Hero — Map Zoom-In */}
        <section className="mx-auto w-full max-w-6xl">
          <div className="enterprise-glass relative overflow-hidden rounded-3xl border border-sky-300/15 p-8 md:p-12">
            <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_25%_30%,rgba(14,165,233,0.3),transparent_35%),radial-gradient(circle_at_80%_65%,rgba(59,130,246,0.22),transparent_30%)]" />

            <div className="relative">
              <motion.h1
                variants={parkingVariants.mapZoom}
                initial="hidden"
                animate="visible"
                transition={getFramerTransition({ duration: motionTokens.duration.emphasis, delay: 0.1 })}
                className="text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl"
              >
                {product.name}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={getFramerTransition({ delay: 0.2 })}
                className="mt-4 max-w-2xl text-lg text-sky-100/85"
              >
                {product.tagline}
              </motion.p>
            </div>

            {/* Map viewport */}
            <motion.div
              initial={{ opacity: 0.4, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: motionTokens.duration.max, ease: "easeOut" }}
              className="relative mt-8 h-72 overflow-hidden rounded-2xl border border-sky-200/15 bg-slate-950/70"
            >
              {/* Street grid */}
              <div className="absolute inset-0 [background-image:linear-gradient(rgba(56,189,248,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(56,189,248,0.1)_1px,transparent_1px)] [background-size:28px_28px]" />

              {/* Route path SVG */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path
                  className="parking-svg-path"
                  d={`M 15,80 C 25,70 ${parkingSpots[0].x},${parkingSpots[0].y} ${parkingSpots[1].x},${parkingSpots[1].y} S ${parkingSpots[2].x},${parkingSpots[2].y} 85,45`}
                  fill="none"
                  stroke="rgba(56,189,248,0.5)"
                  strokeWidth="0.8"
                  strokeDasharray="600"
                  strokeDashoffset="600"
                />
              </svg>

              {/* User location */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: motionTokens.duration.standard }}
                className="absolute"
                style={{ left: "15%", top: "78%" }}
              >
                <div className="parking-ripple absolute -inset-3 rounded-full bg-sky-400/30" />
                <div className="relative h-4 w-4 rounded-full border-2 border-white bg-sky-400" />
              </motion.div>

              {/* Parking pins */}
              {parkingSpots.map((spot, i) => (
                <motion.div
                  key={spot.name}
                  variants={parkingVariants.pinDrop}
                  initial="hidden"
                  animate={pinsDropped > i ? "visible" : "hidden"}
                  transition={{ duration: motionTokens.duration.standard }}
                  className="absolute"
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                    spot.status === "available" ? "bg-sky-500" : "bg-amber-500"
                  }`}>
                    {spot.spots}
                  </div>
                  <div className={`mx-auto h-2 w-0.5 ${
                    spot.status === "available" ? "bg-sky-500/60" : "bg-amber-500/60"
                  }`} />
                </motion.div>
              ))}

              {/* Map legend */}
              <div className="absolute bottom-3 right-3 flex items-center gap-3 rounded-lg bg-slate-950/80 px-3 py-1.5 text-[10px]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Available</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Limited</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Live Parking Spots */}
        <section className="parking-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200/80">Nearby parking</p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {parkingSpots.map((spot, i) => (
              <motion.article
                key={spot.name}
                variants={parkingVariants.spotReveal}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                transition={getFramerTransition({ delay: i * 0.08 })}
                className="overflow-hidden rounded-2xl border border-sky-200/12 bg-slate-950/60"
              >
                <div className={`h-1.5 w-full ${spot.status === "available" ? "bg-sky-500/40" : "bg-amber-500/40"}`} />
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.14em] text-sky-200/70">Live location</p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-100">{spot.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`text-2xl font-bold ${spot.status === "available" ? "text-sky-300" : "text-amber-300"}`}>
                      {spot.spots}
                    </span>
                    <span className="text-sm text-slate-400">spots open</span>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        {/* What It Does + Visual */}
        <section className="parking-scroll mx-auto mt-16 grid w-full max-w-6xl gap-6 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200/80">How it works</p>
            <p className="mt-4 text-sm leading-7 text-slate-300">{product.description}</p>
            <ul className="mt-5 space-y-3 text-sm text-slate-200">
              {product.whatItDoes.map((point, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={getFramerTransition({ delay: i * motionTokens.stagger.relaxed })}
                  className="flex items-start gap-2"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400/60" />
                  {point}
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Route visualization */}
          <div className="rounded-2xl border border-sky-200/12 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-sky-200/70">Route optimization</p>
            <div className="mt-4 space-y-3">
              {["Search initiated", "3 locations found", "Route calculated", "Navigating..."].map((step, i) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={getFramerTransition({ delay: i * 0.1 })}
                  className="flex items-center gap-3 rounded-lg border border-sky-200/10 bg-slate-900/50 px-4 py-3 text-sm text-slate-200"
                >
                  <span className={`h-2 w-2 rounded-full ${i === 3 ? "bg-sky-400 parking-ripple" : "bg-sky-400/50"}`} />
                  {step}
                  {i === 3 && <span className="ml-auto text-xs text-sky-300 font-mono">LIVE</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="parking-scroll mx-auto mt-16 w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Key features</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {product.features.map((feature, i) => (
              <motion.article
                key={feature.title}
                initial={{ opacity: 0, y: 14, x: 6 }}
                whileInView={{ opacity: 1, y: 0, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={getFramerTransition({ delay: i * motionTokens.stagger.standard })}
                className="enterprise-glass rounded-2xl border border-sky-200/10 p-5 transition-colors hover:border-sky-300/18"
              >
                <div className="mb-4 h-9 w-9 rounded-lg bg-sky-500/15" />
                <h3 className="text-lg font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-300">{feature.text}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-16 w-full max-w-6xl">
          <div className="enterprise-glass rounded-2xl border border-sky-200/12 p-8 text-center">
            <p className="text-sm text-slate-300">Navigate faster with live availability and route-aware decisions.</p>
            <button
              type="button"
              className="mt-5 rounded-full bg-gradient-to-r from-sky-500 to-blue-500 px-7 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
            >
              {product.ctaLabel}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
