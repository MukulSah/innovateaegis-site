"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { products } from "@/lib/products";
import { getFramerTransition, motionTokens } from "@/lib/motion";
import { SiteFooter } from "@/components/site-footer";

export default function ProductsPage() {
  return (
    <div className="pt-28 md:pt-32">
      <main className="px-6 py-16 md:px-10 md:py-20">
        <section className="mx-auto w-full max-w-6xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Products
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-slate-50 md:text-6xl">
            Product systems designed for control, clarity, and outcomes
          </h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-300">
            Explore the complete product landscape across enterprise operations and
            user-focused tools.
          </p>

          <div className="mt-10 space-y-4">
            {products.map((product, index) => (
              <motion.article
                key={product.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={getFramerTransition({
                  duration: motionTokens.duration.emphasis,
                  delay: index * motionTokens.stagger.standard,
                })}
                className="enterprise-glass rounded-2xl border border-white/12 p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      {product.category === "business" ? "Business" : "Build for Users"}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-50">
                      {product.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                      {product.description}
                    </p>
                  </div>
                  <Link
                    href={`/products/${product.slug}`}
                    className="rounded-full border border-indigo-300/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-indigo-100 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200/60 hover:bg-indigo-500/15"
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
