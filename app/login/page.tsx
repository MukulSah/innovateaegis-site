import type { Metadata } from "next";
import Link from "next/link";
import { SaiLoginForm } from "@/components/sai-login-form";

export const metadata: Metadata = {
  title: "Login to SAI COMPANY",
  description:
    "Enter the SAI COMPANY operating system, a digital company headquarters for owners, employees, and AI agents.",
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 pb-20 pt-32 md:px-10 md:pt-36">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb left-[10%] top-[18%] h-64 w-64 bg-purple-600/20" />
        <div className="orb bottom-[8%] right-[12%] h-72 w-72 bg-cyan-500/20" style={{ animationDelay: "1.1s" }} />
      </div>

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_440px]">
        <section>
          <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
            SAI COMPANY HQ
          </p>
          <h1 className="gradient-text-hero mt-6 max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl">
            Log into the operating system that runs a company.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-white/70 md:text-lg">
            SAI COMPANY is a digital organization where founders, employees, and AI agents collaborate on goals,
            projects, operations, releases, decisions, and company memory.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Owner authority", "AI employees", "Company memory"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/70">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="enterprise-glass rounded-3xl border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="mb-7">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/70">Secure access</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">SAI COMPANY Login</h2>
            <p className="mt-3 text-sm leading-6 text-white/55">
              Prototype credentials are prefilled. Use username <span className="font-semibold text-white">admin</span> and
              password <span className="font-semibold text-white">admin</span>.
            </p>
          </div>

          <SaiLoginForm />

          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">
            Return to public website
          </Link>
        </section>
      </div>
    </main>
  );
}
