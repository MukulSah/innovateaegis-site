import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "InnovateAegis | AI Software Company Building Production-Grade Products",
  description:
    "InnovateAegis is an AI software company building production-grade systems: Manavya AI cognitive platform, Sentra endpoint management software, FaceNova face recognition attendance system, and HYGYR resume builder online.",
  keywords: [
    "InnovateAegis",
    "AI software company",
    "AI software company India",
    "Manavya",
    "Manavya AI",
    "Manavya M2",
    "AI cognitive model",
    "face recognition attendance system",
    "endpoint management software",
    "resume builder online",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "InnovateAegis | Product Engineering Company",
    description:
      "We build scalable, real-world software products for businesses and users: Manavya AI, Sentra, FaceNova, and HYGYR.",
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
      name: "Manavya AI",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web, Android",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "A unified AI platform powered by the M2 intelligence engine, built for daily tasks, coding, reasoning, and cowork workspaces.",
    },
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
        {/* HERO SECTION */}
        <section className="relative overflow-hidden px-6 pb-16 pt-14 md:px-10 md:pb-24 md:pt-20">
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
              <span className="rounded-full border border-[#ff6b57]/20 bg-[#ff6b57]/5 px-4 py-2 text-[#ff8a7a]">Manavya Flagship AI</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Face recognition system</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Endpoint management software</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/products/manavya"
                className="glow-btn rounded-full bg-gradient-to-r from-[#ff6b57] to-[#e85a48] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(255,107,87,0.25)]"
              >
                Try Manavya M2 Free
              </Link>
              <a
                href="#products"
                className="rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
              >
                Explore Portfolio
              </a>
            </div>
          </div>
        </section>

        {/* FLAGSHIP SHOWCASE: MANAVYA AI */}
        <section className="px-6 py-12 md:px-10 md:py-16 max-w-6xl mx-auto">
          <div className="relative rounded-3xl border border-[#ff6b57]/20 bg-gradient-to-br from-[#ff6b57]/10 via-white/[0.01] to-[#f5c77e]/5 p-8 md:p-12 shadow-[0_0_40px_rgba(255,107,87,0.06)] overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#ff6b57]/5 blur-3xl" />
            
            <div className="grid gap-10 lg:grid-cols-12 items-center relative z-10">
              {/* Text info */}
              <div className="lg:col-span-8">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-[#ff6b57]/10 border border-[#ff6b57]/25 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#ff8a7a]">
                    Flagship AI Platform
                  </span>
                  <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Live Beta | Free & Unlimited
                  </span>
                </div>
                
                <h2 className="mt-5 text-4xl font-black text-white md:text-5xl leading-none">
                  Manavya
                </h2>
                
                <p className="mt-2 text-xl font-bold bg-gradient-to-r from-[#ff6b57] to-[#f5c77e] bg-clip-text text-transparent">
                  Intelligence born of creation.
                </p>
                
                <p className="mt-4 text-sm md:text-base leading-7 text-white/70 max-w-3xl">
                  One unified AI platform that thinks, researches, plans, writes, codes, creates, and collaborates. 
                  Powered by the M2 engine, Manavya coordinates actions, searches the live web, and logs traces to help you build products and solve daily operational tasks.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/products/manavya"
                    className="rounded-full bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-950 transition-all hover:bg-white/90 hover:scale-105"
                  >
                    Explore Manavya Platform
                  </Link>
                  <a
                    href="https://manavya.innovativeaegis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-white/10"
                  >
                    Launch M2 Engine
                  </a>
                </div>
              </div>

              {/* Graphic Sun-M Logo */}
              <div className="lg:col-span-4 flex justify-center">
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-[#ff6b57]/15 rounded-full blur-xl group-hover:bg-[#ff6b57]/25 transition-all duration-500" />
                  <svg width="130" height="130" viewBox="0 0 120 120" fill="none" className="relative">
                    <defs>
                      <radialGradient id="sunGlowHome" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#fff5e6" />
                        <stop offset="60%" stopColor="#ff6b57" />
                        <stop offset="100%" stopColor="#e85a48" />
                      </radialGradient>
                      <linearGradient id="rayGlowHome" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f5c77e" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#ff6b57" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>
                    <circle cx="60" cy="60" r="42" stroke="url(#rayGlowHome)" strokeWidth="1" strokeDasharray="3 4" className="animate-spin" style={{ animationDuration: "60s" }} />
                    <circle cx="60" cy="60" r="24" fill="url(#sunGlowHome)" />
                    <path d="M44 76 L52 49 L60 62" stroke="#f5c77e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M76 76 L68 49 L60 62" stroke="#f5c77e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Platform Modules Specs Footer */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-white/5 pt-8 text-xs text-white/55">
              <div>
                <h4 className="font-bold text-white">M2 Core Playground</h4>
                <p className="mt-0.5 text-white/40">Dynamic router & tools execution</p>
              </div>
              <div>
                <h4 className="font-bold text-white">Code & Reasoning</h4>
                <p className="mt-0.5 text-white/40">Repository-wide software build</p>
              </div>
              <div>
                <h4 className="font-bold text-white">Multimodal Generation</h4>
                <p className="mt-0.5 text-white/40">Design mockups & video assets</p>
              </div>
              <div>
                <h4 className="font-bold text-white">Manavya Cowork</h4>
                <p className="mt-0.5 text-white/40">Asynchronous collaborative spaces</p>
              </div>
            </div>
          </div>
        </section>

        {/* INNOVATEAEGIS MISSION SECTION */}
        <section className="px-6 py-12 md:px-10 md:py-16">
          <div className="mx-auto w-full max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-300/60">Our Core Mandate</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
                Engineering-first software development.
              </h2>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Built as products, not projects</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Every system has an owned roadmap, feedback loop, and measurable product outcomes.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Scalable architecture from day one</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  We build for growth, uptime, and repeatable deployment across teams and environments.
                </p>
              </article>
              <article className="enterprise-glass rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white">Real deployment context</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  Our software is designed for operations, compliance, and day-to-day usage at scale.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* PRODUCT ECOSYSTEM SECTION */}
        <section id="products" className="px-6 py-16 md:px-10 md:py-24">
          <div className="mx-auto w-full max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-purple-300/70">Product Ecosystem</p>
            <h2 className="gradient-text mt-4 max-w-4xl text-3xl font-bold tracking-tight md:text-5xl">
              Production-grade systems built for businesses and individuals
            </h2>

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {/* Product 1: Manavya AI */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-[#ff6b57]/20 bg-gradient-to-br from-[#ff6b57]/5 to-transparent p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-[#ff8a7a]">Flagship AI</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Manavya AI</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    A unified AI reasoning engine that searches the live web, plans objectives, runs code, and tracks persistent project memory.
                  </p>
                </div>
                <Link href="/products/manavya" className="mt-6 inline-flex text-sm font-semibold text-[#ff8a7a] hover:text-[#ff6b57]">
                  Explore Manavya Platform
                </Link>
              </article>

              {/* Product 2: Sentra */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-blue-300/80">For Businesses</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Sentra</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    Sentra is endpoint management software for IT teams that need clear control. It tracks installed software and highlights device risks.
                  </p>
                </div>
                <Link href="/products/sentra" className="mt-6 inline-flex text-sm font-semibold text-blue-300 hover:text-blue-200">
                  Learn more about Sentra
                </Link>
              </article>

              {/* Product 3: FaceNova */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-cyan-300/80">For Businesses</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">FaceNova</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    AI-powered face recognition attendance system built for high accuracy presence tracking across distributed sites.
                  </p>
                </div>
                <Link href="/products/facenova" className="mt-6 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                  Learn more about FaceNova
                </Link>
              </article>

              {/* Product 4: HYGYR */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-violet-300/80">For Users</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">HYGYR</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    A free resume builder online designed for speed and clarity, helping professionals compile job-ready files instantly.
                  </p>
                </div>
                <Link href="/products/hygyr" className="mt-6 inline-flex text-sm font-semibold text-violet-300 hover:text-violet-200">
                  Start with HYGYR
                </Link>
              </article>

              {/* Product 5: Unite Platform */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-rose-300/80">For Businesses</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">Unite Platform</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    A company operating system that aligns cross-functional priorities, department milestones, and tracks blockers.
                  </p>
                </div>
                <Link href="/products/unite" className="mt-6 inline-flex text-sm font-semibold text-rose-300 hover:text-rose-200">
                  Explore Unite Operating System
                </Link>
              </article>

              {/* Product 6: SAI */}
              <article className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-6 flex flex-col justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase text-purple-300/80">For Businesses</p>
                  <h3 className="mt-3 text-2xl font-bold text-white">SAI</h3>
                  <p className="mt-3 text-sm leading-6 text-white/65">
                    Autonomous Software Agent Intelligence. Orchestrate agents, manage releases, execute tasks, and track memory.
                  </p>
                </div>
                <Link href="/products/sai" className="mt-6 inline-flex text-sm font-semibold text-purple-300 hover:text-purple-200">
                  Open SAI Dashboard
                </Link>
              </article>
            </div>
          </div>
        </section>

        {/* WHY INNOVATEAEGIS (WHO WE BUILD FOR) */}
        <section className="px-6 py-12 md:px-10 md:py-20">
          <div className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-white/[0.03] p-8 md:p-12">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-purple-300/70">Who We Build For</p>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
              One company. Two markets. Clear product intent.
            </h2>
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <h3 className="text-xl font-semibold text-white">Business teams</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Sentra, FaceNova, Unite, and SAI are built for organizations that need dependable software for operations,
                  security, attendance, department alignment, and autonomous workflows.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Individual users</h3>
                <p className="mt-3 text-sm leading-7 text-white/70">
                  Manavya AI and HYGYR are free products that solve immediate tasks and introduce users to the
                  InnovateAegis intelligence ecosystem through direct product value.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="px-6 pb-20 pt-8 md:px-10 md:pb-28">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-500/20 via-cyan-500/10 to-purple-500/20 p-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                Ready to experience modern engineering?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75">
                Explore the complete InnovateAegis product ecosystem, built to align operations and empower creators.
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
