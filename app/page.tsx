"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { products } from "@/lib/products";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

gsap.registerPlugin(ScrollTrigger);

/* ── Intro overlay ── */
function IntroOverlay({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 1000);
    const t3 = setTimeout(() => setPhase(3), 1800);
    const t4 = setTimeout(() => onComplete(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <motion.div
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 0.4, ease: motionTokens.ease.standard }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050510]"
    >
      {/* Orbs */}
      <motion.div
        animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-72 w-72 rounded-full bg-purple-600/20 blur-[100px]"
      />
      <motion.div
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute h-60 w-60 translate-x-20 rounded-full bg-cyan-500/20 blur-[90px]"
      />

      {/* Ring burst */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={phase >= 1 ? { scale: [0, 3], opacity: [0.8, 0] } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute h-24 w-24 rounded-full border border-purple-400/60"
      />

      {/* Logo text */}
      <motion.h1
        initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, filter: "blur(0px)" } : {}}
        transition={{ duration: 0.5, ease: motionTokens.ease.standard }}
        className="gradient-text-hero relative text-4xl font-bold tracking-tight md:text-6xl"
      >
        Innovative Aegis
      </motion.h1>

      {/* Tagline */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, ease: motionTokens.ease.standard }}
        className="mt-4 text-sm tracking-[0.3em] uppercase text-purple-200/70"
      >
        Silent systems. Relentless intelligence.
      </motion.p>

      {/* Loading bar */}
      <motion.div
        className="mt-8 h-px w-48 overflow-hidden rounded-full bg-white/10"
      >
        <motion.div
          initial={{ scaleX: 0 }}
          animate={phase >= 2 ? { scaleX: 1 } : {}}
          transition={{ duration: 0.8, ease: motionTokens.ease.standard }}
          className="h-full origin-left bg-gradient-to-r from-purple-500 via-cyan-400 to-pink-500"
        />
      </motion.div>
    </motion.div>
  );
}

/* ── Floating Particles (mouse-reactive) ── */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let mouseX = 0;
    let mouseY = 0;
    let w = 0;
    let h = 0;
    let rafId: number;

    const particles: { x: number; y: number; vx: number; vy: number; size: number; color: string }[] = [];

    const colors = [
      "rgba(124, 58, 237, 0.5)",
      "rgba(6, 182, 212, 0.4)",
      "rgba(236, 72, 153, 0.35)",
      "rgba(167, 139, 250, 0.4)",
    ];

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };

    const init = () => {
      resize();
      particles.length = 0;
      const count = Math.min(60, Math.floor(w / 20));
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        // Mouse repulsion
        const dx = p.x - mouseX;
        const dy = p.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          const force = (150 - dist) / 150;
          p.vx += (dx / dist) * force * 0.3;
          p.vy += (dy / dist) * force * 0.3;
        }

        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(124, 58, 237, ${0.08 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      rafId = requestAnimationFrame(draw);
    };

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
      }
    };

    init();
    rafId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 z-0" />;
}

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [introComplete, setIntroComplete] = useState(false);
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.95]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".js-product-card").forEach((node, index) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 40, scale: 0.95, rotateX: 8 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            rotateX: 0,
            duration: motionTokens.duration.emphasis,
            delay: index * motionTokens.stagger.tight,
            ease: motionTokens.ease.gsapSnap,
            scrollTrigger: {
              trigger: node,
              start: motionTokens.scroll.revealStart,
            },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".js-build-line").forEach((line, index) => {
        gsap.fromTo(
          line,
          { opacity: 0, y: 30, scale: 0.97 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: motionTokens.duration.emphasis,
            delay: index * motionTokens.stagger.relaxed,
            ease: motionTokens.ease.gsapSnap,
            scrollTrigger: {
              trigger: ".js-build-block",
              start: "top 72%",
            },
          },
        );
      });

      gsap.fromTo(
        ".js-bg-flow",
        { xPercent: -4, yPercent: -3, opacity: 0.48 },
        {
          xPercent: 6,
          yPercent: 5,
          opacity: 0.8,
          ease: "none",
          scrollTrigger: {
            trigger: ".js-build-block",
            start: "top 90%",
            end: "bottom 20%",
            scrub: 0.5,
          },
        },
      );
    }, rootRef);

    return () => ctx.revert();
  }, []);

  const scrollToId = (id: string) => {
    const node = document.getElementById(id);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {!introComplete && (
          <IntroOverlay key="intro" onComplete={() => setIntroComplete(true)} />
        )}
      </AnimatePresence>

      <div ref={rootRef} className="pt-28 md:pt-32">
        <main className="relative">
          {/* ── HERO ── */}
          <motion.section
            style={{ opacity: heroOpacity, scale: heroScale }}
            className="relative overflow-hidden px-6 pb-28 pt-16 md:px-10 md:pb-36 md:pt-28"
          >
            <ParticleField />

            {/* Ambient orbs */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="orb left-[10%] top-[10%] h-80 w-80 bg-purple-600/20" />
              <div className="orb right-[15%] top-[5%] h-60 w-60 bg-cyan-500/15" style={{ animationDelay: "2s", animationDuration: "8s" }} />
              <div className="orb left-[50%] bottom-[10%] h-72 w-72 bg-pink-500/10" style={{ animationDelay: "4s", animationDuration: "10s" }} />
            </div>

            <div className="relative z-10 mx-auto w-full max-w-6xl">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={introComplete ? { opacity: 1, y: 0 } : {}}
                transition={{ ...motionTokens.spring.bouncy, delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-1.5"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-400" />
                </span>
                <span className="text-xs font-medium tracking-[0.16em] uppercase text-purple-200/80">
                  Minimal Authority Interface
                </span>
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                animate={introComplete ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
                transition={{ ...motionTokens.spring.smooth, delay: 0.2 }}
                className="gradient-text-hero mt-6 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl md:text-8xl"
              >
                Innovative Aegis
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={introComplete ? { opacity: 1, y: 0 } : {}}
                transition={{ ...motionTokens.spring.smooth, delay: 0.35 }}
                className="mt-6 max-w-2xl text-xl text-purple-100/80 md:text-2xl"
              >
                Silent systems. Relentless intelligence.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={introComplete ? { opacity: 1, y: 0 } : {}}
                transition={{ ...motionTokens.spring.smooth, delay: 0.5 }}
                className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4"
              >
                <button
                  type="button"
                  onClick={() => scrollToId("products")}
                  className="glow-btn w-full rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 sm:w-auto"
                >
                  Explore Products
                </button>
                <button
                  type="button"
                  onClick={() => scrollToId("build")}
                  className="magnetic-hover w-full rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition-all duration-200 hover:border-purple-400/30 hover:bg-white/10 sm:w-auto"
                >
                  Build With Us
                </button>
              </motion.div>

              {/* Scroll indicator */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={introComplete ? { opacity: 1 } : {}}
                transition={{ delay: 1.2 }}
                className="mt-10 flex flex-col items-center gap-2"
              >
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  className="h-8 w-5 rounded-full border border-white/20 p-1"
                >
                  <div className="h-2 w-full rounded-full bg-purple-400/60" />
                </motion.div>
                <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">Scroll</span>
              </motion.div>
            </div>
          </motion.section>

          {/* ── PRODUCTS ── */}
          <section id="products" className="px-6 py-20 md:px-10 md:py-28">
            <div className="mx-auto w-full max-w-6xl">
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70"
              >
                Product Overview
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={getFramerTransition({ spring: true })}
                className="gradient-text mt-4 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl"
              >
                Enterprise and user products with controlled execution paths
              </motion.h2>

              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {products.map((product) => (
                  <motion.article
                    key={product.slug}
                    whileHover={{
                      y: -6,
                      transition: { ...motionTokens.spring.snappy },
                    }}
                    className="js-product-card group card-shimmer enterprise-glass rounded-2xl border border-white/8 p-6"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${product.accentFrom}, ${product.accentTo})` }}
                      />
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-purple-300/60">
                        {product.category === "business" ? "Business" : "Build for Users"}
                      </p>
                    </div>
                    <h3 className="mt-3 text-2xl font-bold text-white">{product.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/60">{product.description}</p>
                    <Link
                      href={`/products/${product.slug}`}
                      className="glow-btn mt-5 inline-flex rounded-full border border-purple-300/20 bg-purple-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-purple-100 transition-all duration-200 hover:border-purple-300/40"
                    >
                      View
                    </Link>
                  </motion.article>
                ))}
              </div>
            </div>
          </section>

          {/* ── BUILD WITH US ── */}
          <section id="build" className="js-build-block relative overflow-hidden px-6 py-24 md:px-10 md:py-32">
            <div className="js-bg-flow bg-flow" />
            <div className="relative mx-auto w-full max-w-4xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/60">
                Build With Us
              </p>
              {[
                "Don't just use systems.",
                "Build them.",
                "Shape what comes next.",
              ].map((line) => (
                <p
                  key={line}
                  className="js-build-line mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-6xl"
                >
                  {line}
                </p>
              ))}
            </div>
          </section>

          {/* ── CONNECT ── */}
          <section id="connect" className="px-6 py-20 md:px-10 md:py-28">
            <div className="mx-auto w-full max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/60">
                Connect
              </p>
              <h2 className="gradient-text mt-4 text-2xl font-bold tracking-tight sm:text-3xl md:text-5xl">
                Start a focused conversation
              </h2>

              <form className="enterprise-glass mt-8 rounded-2xl border border-white/8 p-8">
                <div className="grid gap-5 md:grid-cols-2">
                  <Input label="Name" placeholder="Your name" />
                  <Input label="Email" placeholder="you@company.com" type="email" />
                </div>
                <label className="mt-5 block text-sm font-medium text-white/80">
                  Message
                  <textarea
                    rows={5}
                    placeholder="Tell us what you want to build"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 outline-none transition-all duration-200 focus:border-purple-400/40 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:bg-white/8"
                  />
                </label>
                <button
                  type="button"
                  className="glow-btn mt-6 rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-purple-500/20"
                >
                  Send message
                </button>
              </form>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}

type InputProps = {
  label: string;
  placeholder: string;
  type?: string;
};

function Input({ label, placeholder, type = "text" }: InputProps) {
  return (
    <label className="block text-sm font-medium text-white/80">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/90 outline-none transition-all duration-200 focus:border-purple-400/40 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.15)] focus:bg-white/8"
      />
    </label>
  );
}
