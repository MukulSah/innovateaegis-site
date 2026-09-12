"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { announcements } from "@/lib/announcements";
import { products, type Product } from "@/lib/products";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

const companies = [
  "Google",
  "Microsoft",
  "Amazon",
  "Adobe",
  "NVIDIA",
  "Flipkart",
  "Swiggy",
  "Zomato",
  "Razorpay",
];

export function HomePage() {
  return (
    <div className="relative z-0 pt-40 md:pt-44">
      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16">
          <div className="pointer-events-none absolute inset-0">
            <div className="light-bloom left-[6%] top-[4%] h-72 w-72 bg-[#d4b896]/20" />
            <div className="light-bloom right-[8%] top-[10%] h-64 w-64 bg-[#9ec5d4]/16" style={{ animationDelay: "1.6s" }} />
            <div className="light-bloom bottom-[8%] left-[40%] h-56 w-56 bg-[#ff6b57]/10" style={{ animationDelay: "2.4s" }} />
          </div>

          <div className="relative mx-auto w-full max-w-6xl">
            <p className="lux-kicker">
              House of intelligence · India
            </p>
            <h1 className="font-serif mt-6 max-w-5xl text-5xl font-medium leading-[1.05] tracking-tight text-[#f6f1e8] sm:text-6xl md:text-8xl">
              Soft light. Hard systems. Products that feel inevitable.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
              Innovative Aegis is being reconstructed as a luxury product house.
              CareerMate is live. The Manavya AI model is coming. Aurora AI is being
              cooked for the streets of India.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/products/careermate" className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold">
                Open CareerMate
              </Link>
              <Link
                href="/products/aurora-ai"
                className="rounded-full border border-white/12 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Aurora announcement
              </Link>
            </div>
          </div>
        </section>

        <section id="studio" className="px-6 py-8 md:px-10">
          <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
            {announcements.map((item, index) => (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={getFramerTransition({ delay: index * 0.06, duration: 0.3 })}
              >
                <Link href={item.href} className="lux-panel block rounded-3xl p-6 transition-transform hover:-translate-y-1">
                  <p className="lux-kicker text-[10px]">{item.eyebrow}</p>
                  <h2 className="font-serif mt-4 text-2xl leading-snug text-[#f6f1e8]">{item.title}</h2>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#d4b896]">Read</p>
                </Link>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#12203a] via-[#0a192f] to-[#1a1030] p-8 md:p-12">
            <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <p className="lux-kicker">Formerly HYGYR · Live now</p>
                <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8] md:text-6xl">CareerMate</h2>
                <p className="mt-4 max-w-xl text-lg text-white/70">
                  Not a resume builder. A career operating system — build, improve,
                  practice, apply, get hired. Free forever.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/products/careermate" className="lux-btn rounded-full px-6 py-3 text-sm font-semibold">
                    Product page
                  </Link>
                  <a
                    href="https://careermate.innovativeaegis.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white"
                  >
                    Launch CareerMate
                  </a>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/70">
                <p className="text-[#9ec5d4]">CareerMate</p>
                <ul className="mt-3 space-y-1 font-mono text-xs leading-6 text-white/55">
                  <li>├── Resume Builder</li>
                  <li>├── Resume Analyzer</li>
                  <li>├── ATS Scanner</li>
                  <li>├── Manavya</li>
                  <li>├── Interview Coach</li>
                  <li>├── Career Dashboard</li>
                  <li>├── Application Tracker</li>
                  <li>└── Resume Versions</li>
                </ul>
              </div>
            </div>
            <div className="mt-10 overflow-hidden border-t border-white/10 pt-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/35">Built for resumes sent to</p>
              <div className="mt-4 flex gap-8 overflow-hidden opacity-70">
                <div className="ticker-track flex min-w-max gap-8 text-sm text-white/70">
                  {[...companies, ...companies].map((name, index) => (
                    <span key={`${name}-${index}`}>{name}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden px-6 py-16 md:px-10 md:py-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="aurora-lamp light-bloom left-[10%] top-[20%] h-40 w-[28rem] bg-[#f8e7c4]/25" />
            <div className="aurora-lamp light-bloom right-[12%] top-[28%] h-36 w-[22rem] bg-[#9ec5d4]/20" style={{ animationDelay: "1s" }} />
          </div>
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="lux-kicker">Announcement</p>
              <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8] md:text-6xl">
                Aurora AI is being cooked.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-white/62">
                A robotaxi garage for Indian streets — Innova Crysta on the turntable,
                sensors on the roof, Bengaluru to Chennai on the map, drop into Indiranagar.
                Not a highway demo. A driving mind for India.
              </p>
              <Link href="/products/aurora-ai" className="lux-btn mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Open the Aurora garage
              </Link>
            </div>
            <Link href="/products/aurora-ai" className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b1018]">
              <img
                src="/aurora/garage.png"
                alt="Aurora garage with Toyota Innova Crysta"
                className="h-auto w-full"
              />
              <p className="border-t border-white/8 px-4 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-[#d4b896]/80">
                Garage · Innova Crysta
              </p>
            </Link>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto w-full max-w-6xl rounded-[2rem] border border-[#ff6b57]/20 bg-gradient-to-br from-[#ff6b57]/12 via-transparent to-[#f5c77e]/8 p-8 md:p-12">
            <p className="lux-kicker text-[#ff8a7a]">Coming</p>
            <h2 className="font-serif mt-4 text-4xl text-white md:text-6xl">Manavya AI</h2>
            <p className="mt-2 text-xl text-[#f5c77e]">Intelligence born of creation.</p>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65">
              The Manavya model is coming — a native intelligence layer from Innovative
              Aegis. The M2 engine already thinks in the playground. The full model is
              being finished with the same care as the house around it.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products/manavya" className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950">
                Manavya product
              </Link>
              <a
                href="https://manavya.innovativeaegis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold"
              >
                Open M2 playground
              </a>
            </div>
          </div>
        </section>

        <section id="products" className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">The house</p>
            <h2 className="font-serif mt-4 max-w-3xl text-4xl text-[#f6f1e8] md:text-5xl">
              Eight systems. One standard of finish.
            </h2>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {products.map((product, index) => (
                <ProductTile key={product.slug} product={product} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section id="connect" className="px-6 pb-20 md:px-10 md:pb-28">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 rounded-[2rem] border border-white/10 bg-white/[0.03] p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <p className="lux-kicker">Connect</p>
              <h2 className="font-serif mt-4 text-3xl text-[#f6f1e8] md:text-5xl">
                Write to the studio.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
                Partnerships, CareerMate, Aurora, Manavya, Sentra, FaceNova, SAI —
                one address.
              </p>
            </div>
            <a
              href="mailto:hello@innovativeaegis.com"
              className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              hello@innovativeaegis.com
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductTile({ product, index }: { product: Product; index: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={getFramerTransition({ delay: index * 0.04, duration: 0.28 })}
      className="lux-panel rounded-3xl p-7"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40">
          {product.category === "business" ? "Companies" : "People"}
        </p>
        <span className="rounded-full border border-[#d4b896]/25 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#d4b896]">
          {product.statusLabel}
        </span>
      </div>
      <h3 className="font-serif mt-4 text-3xl text-[#f6f1e8]">{product.name}</h3>
      {product.formerly ? (
        <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">Formerly {product.formerly}</p>
      ) : null}
      <p className="mt-3 text-sm leading-7 text-white/58">{product.tagline}</p>
      <Link
        href={`/products/${product.slug}`}
        className="mt-6 inline-flex text-sm text-[#d4b896] hover:text-[#f6f1e8]"
      >
        Open {product.name}
      </Link>
    </motion.article>
  );
}
