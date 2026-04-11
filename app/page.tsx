import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "InnovateAegis | AI Software Company Building Production-Grade Products",
  description:
    "InnovateAegis is an AI software company building production-grade systems: Sentra endpoint management software, FaceNova face recognition attendance system, and HYGYR resume builder online.",
  keywords: [
    "InnovateAegis",
    "AI software company",
    "AI software company India",
    "face recognition attendance system",
    "face recognition system",
    "endpoint management software",
    "endpoint management tool",
    "resume builder online",
    "resume builder HYGYR",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "InnovateAegis | Product Engineering Company",
    description:
      "We build scalable, real-world software products for businesses and users: Sentra, FaceNova, and HYGYR.",
    url: "https://innovativeaegis.com",
    type: "website",
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "InnovateAegis",
  alternateName: "Innovative Aegis",
  url: "https://innovativeaegis.com",
  description:
    "InnovateAegis is a product-focused AI software company building production-grade systems for businesses and users.",
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Sentra",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Windows, macOS, Linux",
      description:
        "Endpoint management software that gives IT teams complete visibility into installed software and device posture across the organization.",
    },
    {
      "@type": "SoftwareApplication",
      name: "FaceNova",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "AI-powered face recognition attendance system with multi-camera tracking, motion detection, and high-accuracy identity matching.",
    },
    {
      "@type": "SoftwareApplication",
      name: "HYGYR",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Resume builder online designed for speed and clarity, offered free to users entering the InnovateAegis ecosystem.",
    },
  ],
};

export default function Home() {
  return (
    <div className="pt-28 md:pt-32">
      <main>
        <section className="relative overflow-hidden px-6 pb-20 pt-14 md:px-10 md:pb-28 md:pt-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="orb left-[8%] top-[8%] h-64 w-64 bg-purple-600/20" />
            <div className="orb right-[10%] top-[15%] h-56 w-56 bg-cyan-500/20" style={{ animationDelay: "1.2s" }} />
          </div>

          <div className="relative mx-auto w-full max-w-6xl">
            <p className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold tracking-[0.16em] uppercase text-purple-200/80">
              Product Engineering Company
            </p>
            <h1 className="gradient-text-hero mt-6 max-w-5xl text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl">
              InnovateAegis builds production-grade software systems that run in the real world.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-white/75 md:text-lg">
              We are an AI software company, not an IT services agency. Our products are built,
              deployed, and improved for daily operational use across businesses and end users.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">AI software company India</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Face recognition system</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Endpoint management software</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Resume builder online</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="glow-btn rounded-full bg-gradient-to-r from-purple-600 to-cyan-500 px-7 py-3 text-sm font-semibold text-white"
              >
                Explore Products
              </Link>
              <Link
                href="/products/hygyr"
                className="rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Try HYGYR Free
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto grid w-full max-w-6xl gap-4 md:grid-cols-3">
            <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white">Built as products, not projects</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Every system has an owned roadmap, feedback loop, and measurable product outcomes.
              </p>
            </article>
            <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white">Scalable architecture from day one</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                We build for growth, uptime, and repeatable deployment across teams and environments.
              </p>
            </article>
            <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
              <h2 className="text-lg font-semibold text-white">Real deployment context</h2>
              <p className="mt-3 text-sm leading-7 text-white/65">
                Our software is designed for operations, compliance, and day-to-day usage at scale.
              </p>
            </article>
          </div>
        </section>

        <section id="products" className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-300/70">Core Products</p>
            <h2 className="gradient-text mt-4 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">
              Three focused products serving business operations and everyday users
            </h2>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-blue-300/80">For Businesses</p>
                <h3 className="mt-3 text-2xl font-bold text-white">Sentra</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Sentra is endpoint management software for IT teams that need clear control. It tracks installed
                  software across machines, highlights risk quickly, and simplifies policy enforcement.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li>Software inventory visibility across devices</li>
                  <li>Faster audits and compliance reporting</li>
                  <li>Centralized control for distributed teams</li>
                </ul>
                <Link href="/products/sentra" className="mt-6 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200">
                  Learn more about Sentra
                </Link>
              </article>

              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-300/80">For Businesses</p>
                <h3 className="mt-3 text-2xl font-bold text-white">FaceNova</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  FaceNova is a real-time face recognition attendance system built for reliability. It supports
                  multi-camera tracking, motion detection, and high-accuracy recognition in active environments.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li>Trusted attendance logs with less manual effort</li>
                  <li>Accurate presence tracking across sites</li>
                  <li>Operational visibility for HR and admin teams</li>
                </ul>
                <Link href="/products/facenova" className="mt-6 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  Learn more about FaceNova
                </Link>
              </article>

              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6">
                <p className="text-xs font-semibold tracking-[0.14em] uppercase text-violet-300/80">For Users</p>
                <h3 className="mt-3 text-2xl font-bold text-white">HYGYR</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  HYGYR is a free resume builder online for students and professionals. Users create clean,
                  job-ready resumes faster while entering the InnovateAegis product ecosystem.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-white/70">
                  <li>Simple writing flow with practical guidance</li>
                  <li>Modern templates that stay ATS-friendly</li>
                  <li>Quick export and easy iteration</li>
                </ul>
                <Link href="/products/hygyr" className="mt-6 inline-flex text-sm font-semibold text-violet-300 hover:text-violet-200">
                  Start with HYGYR
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-purple-300/70">Who We Build For</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              One company. Two markets. Clear product intent.
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold text-white">Business teams</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Sentra and FaceNova are built for organizations that need dependable software for operations,
                  security, attendance, and accountability.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Individual users</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  HYGYR is a free user product that solves an immediate need and introduces people to the
                  InnovateAegis ecosystem through direct product value.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-20 pt-8 md:px-10 md:pb-28">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-cyan-500/10 to-purple-500/20 p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Looking for a serious AI software company in India?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
                InnovateAegis builds scalable, real-world products that move from concept to production and keep improving after launch.
              </p>
            </div>
            <Link
              href="/products"
              className="glow-btn rounded-full bg-white px-7 py-3 text-sm font-semibold text-slate-900"
            >
              See Product Portfolio
            </Link>
          </div>
        </section>

        <script
          type="application/ld+json"
          // JSON-LD is embedded as a static string for search engine parsing.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
