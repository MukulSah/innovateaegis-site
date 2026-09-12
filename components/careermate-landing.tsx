"use client";

import Link from "next/link";
import type { Product } from "@/lib/products";

const CAREERMATE_URL = "https://careermate.innovativeaegis.com/";
const AUTH_URL = "https://careermate.innovativeaegis.com/auth";

const stages = [
  { title: "Student", text: "Campus placements and graduate programs." },
  { title: "First Job", text: "Your first professional resume that gets callbacks." },
  { title: "Experienced", text: "Level up impact, metrics, and role alignment." },
  { title: "Career Switch", text: "Reframe your story for a new domain." },
  { title: "Leadership", text: "Executive presence for senior and director roles." },
];

const journey = [
  { step: "01", title: "Create a professional resume", text: "Start with the structure recruiters expect — name, experience, education, skills." },
  { step: "02", title: "Manavya improves it", text: "Every bullet reviewed before recruiters see it. Generic lines become proof." },
  { step: "03", title: "ATS approves it", text: "Built to pass modern hiring systems. Watch the score climb." },
  { step: "04", title: "Practice interviews", text: "Rehearse until confidence replaces anxiety." },
  { step: "05", title: "Track applications", text: "One dashboard from applied to offer." },
  { step: "06", title: "Receive interview calls", text: "Your next conversation starts here." },
];

const modules = [
  "Resume Builder",
  "Resume Analyzer",
  "ATS Scanner",
  "Manavya",
  "Interview Coach",
  "Career Dashboard",
  "Application Tracker",
  "Resume Versions",
];

const companies = [
  "Google", "Microsoft", "Amazon", "Adobe", "Oracle", "Salesforce",
  "Atlassian", "NVIDIA", "Meta", "Uber", "Flipkart", "Swiggy", "Zomato", "Razorpay", "Meesho",
];

type Props = { product: Product };

export function CareerMateLanding({ product }: Props) {
  return (
    <div className="relative z-0 pt-40 md:pt-44">
      <main>
        <section className="relative overflow-hidden px-6 pb-16 pt-10 md:px-10 md:pb-24">
          <div className="pointer-events-none absolute inset-0">
            <div className="light-bloom left-[8%] top-[6%] h-72 w-72 bg-[#3b82f6]/20" />
            <div className="light-bloom right-[10%] top-[12%] h-64 w-64 bg-[#a855f7]/18" />
          </div>
          <div className="relative mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Formerly HYGYR · Live on careermate.innovativeaegis.com</p>
            <h1 className="font-serif mt-6 max-w-5xl text-5xl leading-[1.05] text-[#f6f1e8] md:text-7xl">
              Everything you need to get hired.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/65">
              {product.description}
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-white/55">
              {["Free forever", "ATS ready", "Manavya review", "Interview prep", "Application tracker"].map((chip) => (
                <span key={chip} className="rounded-full border border-white/12 px-4 py-2">{chip}</span>
              ))}
            </div>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href={AUTH_URL} target="_blank" rel="noopener noreferrer" className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold">
                Start free
              </a>
              <a href={CAREERMATE_URL} target="_blank" rel="noopener noreferrer" className="rounded-full border border-white/12 px-7 py-3.5 text-sm font-semibold">
                Open CareerMate
              </a>
            </div>
            <div className="mt-14 grid gap-4 sm:grid-cols-4">
              {[
                ["10", "Resume templates"],
                ["7", "Editable sections"],
                ["5", "Template families"],
                ["₹0", "Price"],
              ].map(([stat, label]) => (
                <div key={label} className="lux-panel rounded-2xl p-5">
                  <p className="font-serif text-3xl text-[#f6f1e8]">{stat}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Built for every career stage</p>
            <h2 className="font-serif mt-4 text-3xl text-[#f6f1e8] md:text-5xl">Where are you today?</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {stages.map((stage, index) => (
                <article key={stage.title} className="lux-panel rounded-2xl p-5">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#d4b896]">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{stage.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/55">{stage.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-16 md:px-10">
          <div className="mx-auto w-full max-w-6xl">
            <p className="lux-kicker">Career journey</p>
            <h2 className="font-serif mt-4 max-w-3xl text-3xl text-[#f6f1e8] md:text-5xl">
              You need a job. We handle everything after.
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {journey.map((item) => (
                <article key={item.step} className="lux-panel rounded-2xl p-6">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[#9ec5d4]">{item.step}</p>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-white/58">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2">
            <div className="lux-panel rounded-[2rem] p-8">
              <p className="lux-kicker">Meet Manavya</p>
              <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8]">The career mentor that reviews every resume before recruiters do.</h2>
              <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-5 text-sm">
                <p className="text-[#ff8a7a]">Manavya</p>
                <p className="mt-3 text-white/70">Your project descriptions are too generic.</p>
                <p className="mt-4 text-white/40">Replace “Worked on backend”</p>
                <p className="mt-1 text-[#d4b896]">With “Designed REST APIs serving 40K requests/day.”</p>
                <p className="mt-4 text-xs uppercase tracking-[0.16em] text-emerald-300">ATS score +9</p>
              </div>
            </div>
            <div className="lux-panel rounded-[2rem] p-8">
              <p className="lux-kicker">The platform</p>
              <h2 className="font-serif mt-4 text-4xl text-[#f6f1e8]">Not a resume builder. A career operating system.</h2>
              <ul className="mt-8 space-y-2 font-mono text-sm text-white/60">
                {modules.map((item, index) => (
                  <li key={item}>
                    {index === modules.length - 1 ? "└── " : "├── "}
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 p-8">
            <p className="lux-kicker">Built for resumes sent to</p>
            <div className="mt-6 flex gap-8 overflow-hidden">
              <div className="ticker-track flex min-w-max gap-8 text-sm text-white/60">
                {[...companies, ...companies].map((name, index) => (
                  <span key={`${name}-${index}`}>{name}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 py-12 md:px-10">
          <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2">
            <div className="lux-panel rounded-[2rem] p-8">
              <p className="text-sm uppercase tracking-[0.16em] text-white/35">Others</p>
              <ul className="mt-5 space-y-3 text-sm text-white/50">
                <li>Monthly subscription</li>
                <li>Pay to download</li>
                <li>Locked templates</li>
                <li>Export paywall</li>
              </ul>
            </div>
            <div className="rounded-[2rem] border border-[#d4b896]/30 bg-[#d4b896]/8 p-8">
              <p className="text-sm uppercase tracking-[0.16em] text-[#d4b896]">CareerMate</p>
              <p className="font-serif mt-3 text-5xl text-[#f6f1e8]">₹0 forever</p>
              <ul className="mt-5 space-y-3 text-sm text-white/70">
                <li>Free download</li>
                <li>All templates open</li>
                <li>No hidden upgrades</li>
                <li>No credit card</li>
              </ul>
              <a href={AUTH_URL} target="_blank" rel="noopener noreferrer" className="lux-btn mt-8 inline-flex rounded-full px-6 py-3 text-sm font-semibold">
                Enter CareerMate
              </a>
            </div>
          </div>
        </section>

        <section className="px-6 pb-24 pt-8 md:px-10">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/10 bg-gradient-to-r from-[#3b82f6]/15 via-transparent to-[#a855f7]/15 p-8 md:p-12">
            <h2 className="font-serif text-4xl text-[#f6f1e8] md:text-5xl">Your next interview starts here.</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-white/60">
              CareerMate never asks you to pay to download your own resume. HYGYR grew up. This is the product.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href={AUTH_URL} target="_blank" rel="noopener noreferrer" className="lux-btn rounded-full px-7 py-3.5 text-sm font-semibold">
                {product.ctaLabel}
              </a>
              <Link href="/products" className="rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold">
                Back to the house
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
