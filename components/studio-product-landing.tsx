"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";

export function StudioProductLanding({ product }: { product: Product }) {
  const ctaHref =
    product.liveUrl ??
    `mailto:hello@innovativeaegis.com?subject=${encodeURIComponent(product.name)}`;

  return (
    <div className="relative z-0 pt-40 md:pt-44">
      <main className="px-6 pb-24 pt-10 md:px-10">
        <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 p-8 md:p-12">
          <div className="light-bloom left-[8%] top-[10%] h-56 w-56 bg-[#d4b896]/16" />
          <p className="lux-kicker relative">{product.statusLabel}</p>
          <h1 className="font-serif relative mt-5 text-5xl text-[#f6f1e8] md:text-7xl">{product.name}</h1>
          <p className="relative mt-4 text-xl text-[#d4b896]">{product.tagline}</p>
          <p className="relative mt-5 max-w-2xl text-sm leading-8 text-white/60">{product.description}</p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link
              href={ctaHref}
              target={ctaHref.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              {product.ctaLabel}
            </Link>
            <Link href="/products" className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold">
              All products
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-2">
          {product.whatItDoes.map((point) => (
            <article key={point} className="lux-panel rounded-2xl p-6">
              <p className="text-sm leading-7 text-white/65">{point}</p>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-10 grid w-full max-w-6xl gap-4 md:grid-cols-2">
          {product.features.map((feature) => (
            <article key={feature.title} className="lux-panel rounded-3xl p-7">
              <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/58">{feature.text}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
