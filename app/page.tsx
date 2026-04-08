"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { products } from "@/lib/products";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

gsap.registerPlugin(ScrollTrigger);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: getFramerTransition({ duration: motionTokens.duration.emphasis }),
  },
};

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".js-product-card").forEach((node, index) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 22, scale: 0.98 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: motionTokens.duration.emphasis,
            delay: index * motionTokens.stagger.tight,
            ease: motionTokens.ease.gsapStandard,
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
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: motionTokens.duration.standard,
            delay: index * motionTokens.stagger.relaxed,
            ease: motionTokens.ease.gsapStandard,
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
          opacity: 0.72,
          ease: "none",
          scrollTrigger: {
            trigger: ".js-build-block",
            start: "top 90%",
            end: "bottom 20%",
            scrub: 0.8,
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
    <div ref={rootRef} className="pt-28 md:pt-32">
      <main className="relative">
        <section className="relative overflow-hidden px-6 pb-24 pt-16 md:px-10 md:pb-28 md:pt-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.24),transparent_38%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(79,70,229,0.2),transparent_34%)]" />
            {/* Animated grid nodes */}
            {Array.from({ length: 20 }).map((_, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0.15, y: 0 }}
                animate={{ opacity: [0.12, 0.38, 0.12], y: [0, -6, 0] }}
                transition={{
                  duration: 3.6 + (index % 4) * 0.4,
                  delay: index * 0.08,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-1 w-1 rounded-full bg-indigo-300/50"
                style={{
                  top: `${8 + (index % 8) * 10}%`,
                  left: `${4 + index * 4.5}%`,
                }}
              />
            ))}
            {/* Grid connection lines */}
            {Array.from({ length: 6 }).map((_, index) => (
              <motion.div
                key={`line-${index}`}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 0.12, 0], scaleX: [0.3, 1, 0.3] }}
                transition={{
                  duration: 4 + index * 0.5,
                  delay: 1 + index * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute h-px bg-gradient-to-r from-transparent via-indigo-400/30 to-transparent"
                style={{
                  top: `${15 + index * 13}%`,
                  left: "5%",
                  width: `${30 + index * 8}%`,
                  transformOrigin: "left",
                }}
              />
            ))}
          </div>

          <div className="relative mx-auto w-full max-w-6xl">
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200/80"
            >
              Minimal Authority Interface
            </motion.p>
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={getFramerTransition({
                delay: 0.08,
                duration: motionTokens.duration.emphasis,
              })}
              className="mt-4 max-w-4xl text-5xl font-semibold tracking-tight text-slate-50 md:text-7xl"
            >
              Innovative Aegis
            </motion.h1>
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={getFramerTransition({
                delay: 0.14,
                duration: motionTokens.duration.emphasis,
              })}
              className="mt-5 max-w-2xl text-xl text-slate-200 md:text-2xl"
            >
              Silent systems. Relentless intelligence.
            </motion.p>

            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={getFramerTransition({
                delay: 0.2,
                duration: motionTokens.duration.emphasis,
              })}
              className="mt-9 flex flex-wrap gap-4"
            >
              <button
                type="button"
                onClick={() => scrollToId("products")}
                className="rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Explore Products
              </button>
              <button
                type="button"
                onClick={() => scrollToId("build")}
                className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-slate-100 transition-transform duration-300 hover:-translate-y-0.5"
              >
                Build With Us
              </button>
            </motion.div>
          </div>
        </section>

        <section id="products" className="px-6 py-18 md:px-10 md:py-22">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Product Overview
            </p>
            <h2 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-50 md:text-5xl">
              Enterprise and user products with controlled execution paths
            </h2>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {products.map((product) => (
                <motion.article
                  key={product.slug}
                  whileHover={{
                    y: -5,
                    transition: getFramerTransition({ duration: motionTokens.duration.quick }),
                  }}
                  className="js-product-card group enterprise-glass rounded-2xl border border-white/12 p-5 transition-shadow duration-300 hover:shadow-[0_0_24px_rgba(99,102,241,0.12)]"
                >
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                    {product.category === "business" ? "Business" : "Build for Users"}
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold text-slate-50">{product.name}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-300">{product.description}</p>
                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-5 inline-flex rounded-full border border-indigo-300/35 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200/60 hover:bg-indigo-500/14"
                  >
                    View
                  </Link>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="build" className="js-build-block relative overflow-hidden px-6 py-20 md:px-10 md:py-24">
          <div className="js-bg-flow bg-flow" />
          <div className="relative mx-auto w-full max-w-4xl text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Build With Us
            </p>
            {[
              "Don't just use systems.",
              "Build them.",
              "Shape what comes next.",
            ].map((line) => (
              <p
                key={line}
                className="js-build-line mt-4 text-3xl font-semibold tracking-tight text-slate-50 md:text-5xl"
              >
                {line}
              </p>
            ))}
          </div>
        </section>

        <section id="connect" className="px-6 py-18 md:px-10 md:py-22">
          <div className="mx-auto w-full max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Connect
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">
              Start a focused conversation
            </h2>

            <form className="enterprise-glass mt-6 rounded-2xl border border-white/12 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Name" placeholder="Your name" />
                <Input label="Email" placeholder="you@company.com" type="email" />
              </div>
              <label className="mt-4 block text-sm font-medium text-slate-200">
                Message
                <textarea
                  rows={5}
                  placeholder="Tell us what you want to build"
                  className="mt-2 w-full rounded-xl border border-white/14 bg-slate-900/55 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-indigo-300/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
                />
              </label>
              <button
                type="button"
                className="mt-5 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition-transform duration-300 hover:-translate-y-0.5"
              >
                Send message
              </button>
            </form>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

type InputProps = {
  label: string;
  placeholder: string;
  type?: string;
};

function Input({ label, placeholder, type = "text" }: InputProps) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      <input
        type={type}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/14 bg-slate-900/55 px-4 py-3 text-sm text-slate-100 outline-none transition-all duration-300 focus:border-indigo-300/60 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
      />
    </label>
  );
}
