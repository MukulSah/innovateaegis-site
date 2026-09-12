"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { products } from "@/lib/products";
import { motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

export default function ProductsPage() {
  return (
    <div className="relative z-0 pt-40 md:pt-44">
      <main className="px-6 py-16 md:px-10 md:py-24">
        <section className="mx-auto w-full max-w-6xl">
          <p className="lux-kicker">The house</p>
          <h1 className="font-serif mt-5 max-w-4xl text-4xl font-medium tracking-tight text-[#f6f1e8] sm:text-5xl md:text-7xl">
            Products with a finished surface and a living system underneath.
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/58">
            CareerMate is live. Manavya is coming. Aurora is in the lab. The rest of
            the house — Sentra, FaceNova, SAI, Unite, Parking — keeps the same standard.
          </p>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            {products.map((product, index) => (
              <motion.article
                key={product.slug}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ ...motionTokens.spring.smooth, delay: index * 0.04 }}
                className="lux-panel rounded-[1.6rem] p-7"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-[#d4b896]/25 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#d4b896]">
                        {product.statusLabel}
                      </span>
                      <span className="text-[10px] uppercase tracking-[0.16em] text-white/35">
                        {product.category === "business" ? "Companies" : "People"}
                      </span>
                    </div>
                    <h2 className="font-serif mt-4 text-3xl text-[#f6f1e8]">{product.name}</h2>
                    {product.formerly ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/35">
                        Formerly {product.formerly}
                      </p>
                    ) : null}
                    <p className="mt-3 max-w-xl text-sm leading-7 text-white/58">
                      {product.description}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href={`/products/${product.slug}`}
                    className="lux-btn rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em]"
                  >
                    Open
                  </Link>
                  {product.liveUrl ? (
                    <Link
                      href={product.liveUrl}
                      target={product.liveUrl.startsWith("http") ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/12 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white/80"
                    >
                      Launch
                    </Link>
                  ) : null}
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
