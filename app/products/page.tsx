"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { products } from "@/lib/products";
import { motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

export default function ProductsPage() {
  return (
    <div className="pt-28 md:pt-32">
      <main className="px-6 py-16 md:px-10 md:py-24">
        <section className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/60">
            Products
          </p>
          <h1 className="gradient-text mt-4 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">
            Product systems designed for control, clarity, and outcomes
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-white/60">
            Explore the complete product landscape across enterprise operations and
            user-focused tools.
          </p>

          <div className="mt-12 space-y-5">
            {products.map((product, index) => (
              <motion.article
                key={product.slug}
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ ...motionTokens.spring.snappy, delay: index * motionTokens.stagger.standard }}
                whileHover={{ y: -3, transition: { ...motionTokens.spring.snappy } }}
                className="card-shimmer enterprise-glass rounded-2xl border border-white/8 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${product.accentFrom}, ${product.accentTo})` }}
                      />
                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-purple-300/60">
                        {product.category === "business" ? "Business" : "Build for Users"}
                      </p>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold text-white">
                      {product.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-white/60">
                      {product.description}
                    </p>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="glow-btn rounded-full border border-purple-300/20 bg-purple-500/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-purple-100 transition-all duration-200 hover:border-purple-300/40"
                  >
                    Open
                  </Link>
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
