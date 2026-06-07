import type { Metadata } from "next";
import { AskSaiCard } from "@/components/ask-sai-card";
import { SaiAuthGate, SaiLogoutButton } from "@/components/sai-auth-gate";

export const metadata: Metadata = {
  title: "SAI COMPANY Dashboard",
  description:
    "SAI COMPANY is a modern AI-powered company operating system where owners, employees, and AI agents run the organization together.",
  robots: {
    index: false,
    follow: false,
  },
};

const overviewMetrics = [
  { label: "Active Projects", value: "12", detail: "4 at risk, 8 on track" },
  { label: "Employees Online", value: "38", detail: "Engineering, product, sales, ops" },
  { label: "AI Agents Active", value: "16", detail: "24/7 company workforce" },
  { label: "Revenue", value: "$284K", detail: "Pipeline and recurring revenue" },
  { label: "Releases", value: "7", detail: "2 pending owner approval" },
  { label: "Open Issues", value: "43", detail: "9 critical across products" },
  { label: "Current Objectives", value: "6", detail: "Company-level outcomes" },
  { label: "Org Health Score", value: "84%", detail: "Strong with operational risks" },
];

const healthSignals = [
  {
    name: "Engineering Health",
    status: "Green",
    explanation: "Velocity is strong, code review time is stable, and release quality is improving.",
  },
  {
    name: "Product Health",
    status: "Yellow",
    explanation: "Roadmap is clear, but Sentra deployment scope needs tighter prioritization.",
  },
  {
    name: "Revenue Health",
    status: "Green",
    explanation: "Pipeline coverage is healthy and conversion signals are trending up.",
  },
  {
    name: "Customer Health",
    status: "Yellow",
    explanation: "Customers are engaged, but support response time is approaching the risk threshold.",
  },
  {
    name: "Operations Health",
    status: "Green",
    explanation: "Resource allocation and delivery cadence are balanced across active teams.",
  },
  {
    name: "Knowledge Health",
    status: "Red",
    explanation: "Architecture and decision memory need immediate backfill before the next release.",
  },
];

const memoryTypes = [
  {
    title: "Product Memory",
    body: "Why features exist, which objective created them, and what user or business value they serve.",
  },
  {
    title: "Engineering Memory",
    body: "How systems were built, code ownership, technical decisions, incidents, and scaling constraints.",
  },
  {
    title: "Customer Memory",
    body: "Who requested changes, what problems customers reported, and how satisfaction changed over time.",
  },
  {
    title: "Decision Memory",
    body: "Why decisions were made, who approved them, what tradeoffs existed, and when to revisit them.",
  },
  {
    title: "Business Memory",
    body: "Revenue impact, growth experiments, market signals, opportunity history, and operating risks.",
  },
];

const profileTypes = [
  {
    title: "Owner Profile",
    body: "Highest authority with access to objectives, projects, employees, agents, releases, analytics, and all company data.",
  },
  {
    title: "Employee Profiles",
    body: "Human teammates track role, department, assigned work, activity history, performance, skills, and knowledge contributions.",
  },
  {
    title: "AI Agent Profiles",
    body: "Digital employees track role, responsibilities, memory, assigned projects, collaboration history, and performance metrics.",
  },
];

const employeeExamples = [
  "Software Engineer",
  "QA Engineer",
  "Product Manager",
  "Sales Executive",
  "HR",
  "Marketing",
  "DevOps Engineer",
];

const agents = [
  {
    name: "CEO Agent",
    role: "Company growth",
    responsibilities: ["Revenue", "Opportunities", "Market trends", "Business risks", "Product opportunities"],
  },
  {
    name: "COO Agent",
    role: "Operations",
    responsibilities: ["Team productivity", "Resource allocation", "Delivery performance"],
  },
  {
    name: "Product Manager Agent",
    role: "Product planning",
    responsibilities: ["Product requirements", "User stories", "Acceptance criteria"],
  },
  {
    name: "Solution Architect Agent",
    role: "System design",
    responsibilities: ["Architecture diagrams", "Database designs", "API contracts", "Security models", "Scaling plans"],
  },
  {
    name: "Project Manager Agent",
    role: "Delivery",
    responsibilities: ["Timelines", "Dependencies", "Risks", "Progress", "Task ownership"],
  },
  {
    name: "Team Orchestrator Agent",
    role: "Work routing",
    responsibilities: ["Task assignment", "Workload balancing", "Dependency tracking", "Escalation handling"],
  },
  {
    name: "Software Engineer Agent",
    role: "Build solutions",
    responsibilities: ["Assigned tasks", "Implemented features", "Code ownership", "Technical decisions", "Bugs fixed"],
  },
  {
    name: "QA Engineer Agent",
    role: "Quality",
    responsibilities: ["Test plans", "Validation", "Bug reports", "Regression testing", "Acceptance verification"],
  },
  {
    name: "DevOps Agent",
    role: "Deployment",
    responsibilities: ["Infrastructure", "CI/CD", "Monitoring", "Releases", "Rollbacks"],
  },
  {
    name: "Security Agent",
    role: "Risk control",
    responsibilities: ["Vulnerability detection", "Security reviews", "Compliance checks", "Risk analysis"],
  },
  {
    name: "Documentation Agent",
    role: "Knowledge",
    responsibilities: ["Technical docs", "User docs", "Architecture docs", "Release notes"],
  },
  {
    name: "Customer Success Agent",
    role: "Customer memory",
    responsibilities: ["Customer issues", "Feature requests", "Satisfaction", "Customer context"],
  },
  {
    name: "Sales Agent",
    role: "Revenue pipeline",
    responsibilities: ["Leads", "Opportunities", "Prospects", "Revenue pipeline"],
  },
  {
    name: "Marketing Agent",
    role: "Growth",
    responsibilities: ["Campaigns", "Content", "Growth activities", "Brand monitoring"],
  },
  {
    name: "HR Agent",
    role: "People operations",
    responsibilities: ["Employees", "Performance", "Hiring needs", "Training"],
  },
];

const objectiveAutomation = [
  "Creates requirement document",
  "Creates product plan",
  "Creates architecture",
  "Creates tasks",
  "Assigns engineers",
  "Generates test plans",
  "Tracks progress",
  "Verifies completion",
  "Deploys release",
  "Stores knowledge",
];

const lifecycle = [
  "Backlog",
  "Planning",
  "Ready",
  "Assigned",
  "In Progress",
  "Code Review",
  "Testing",
  "Approval",
  "Released",
  "Knowledge Archived",
];

const twinQuestions = [
  "Why is this project delayed?",
  "Which engineer is overloaded?",
  "Which feature generated the most value?",
  "Which product should we prioritize next?",
];

function statusClass(status: string) {
  if (status === "Green") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "Yellow") {
    return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100";
  }

  return "border-red-300/25 bg-red-400/10 text-red-100";
}

export default function SaiCompanyPage() {
  return (
    <SaiAuthGate>
      <main className="min-h-screen overflow-hidden px-5 py-5 md:px-8">
        <div className="mx-auto w-full max-w-7xl">
          <header className="sticky top-4 z-40 rounded-3xl border border-white/10 bg-[#050510]/80 px-4 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/70">Living company headquarters</p>
                <h1 className="gradient-text mt-1 text-2xl font-bold tracking-tight md:text-3xl">SAI COMPANY</h1>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-purple-300/20 bg-purple-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-purple-100">
                  Owner: admin
                </span>
                <SaiLogoutButton />
              </div>
            </div>
          </header>

          <section className="relative py-8 md:py-10">
            <div className="pointer-events-none absolute inset-0">
              <div className="orb left-[4%] top-[12%] h-56 w-56 bg-cyan-500/20" />
              <div className="orb right-[10%] top-[18%] h-72 w-72 bg-purple-600/20" style={{ animationDelay: "1s" }} />
            </div>

            <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="enterprise-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
                <p className="inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-purple-200/80">
                  Company Operating System
                </p>
                <h2 className="gradient-text-hero mt-5 text-4xl font-bold tracking-tight md:text-6xl">
                  The operating system that runs a company.
                </h2>
                <p className="mt-5 text-sm leading-7 text-white/68 md:text-base">
                  SAI COMPANY is not a project management tool or a task management app. It is a unified digital
                  organization where every action, project, employee, agent, customer, task, release, meeting, and
                  decision exists inside one system.
                </p>
                <div className="mt-6 rounded-2xl border border-cyan-300/15 bg-cyan-400/5 p-4">
                  <p className="text-sm font-semibold text-cyan-100">SAI Brain continuously asks:</p>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-white">Are we moving closer to company goals?</p>
                </div>
              </div>

              <AskSaiCard />
            </div>
          </section>

          <section className="py-6">
            <SectionHeading eyebrow="Company Overview" title="One screen for the live state of the organization." />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {overviewMetrics.map((metric) => (
                <article key={metric.label} className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">{metric.label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-white/55">{metric.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="py-10">
            <SectionHeading eyebrow="Organization Health" title="Every department exposes a status, signal, and explanation." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {healthSignals.map((signal) => (
                <article key={signal.name} className="enterprise-glass rounded-2xl border border-white/10 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-white">{signal.name}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(signal.status)}`}>
                      {signal.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/60">{signal.explanation}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-5 py-10 lg:grid-cols-[1fr_1.2fr]">
            <article className="enterprise-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/70">SAI Brain</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">Central intelligence for the company.</h2>
              <p className="mt-5 text-sm leading-7 text-white/65">
                Everything reports to SAI Brain: projects, tasks, products, employees, agents, customers, revenue,
                documentation, meetings, and decisions. It interprets company activity through objectives and outcomes.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Projects", "Tasks", "Products", "Employees", "Agents", "Customers", "Revenue", "Meetings"].map((item) => (
                  <span key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/65">
                    {item}
                  </span>
                ))}
              </div>
            </article>

            <article className="enterprise-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/70">Company Memory</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">The company never forgets.</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {memoryTypes.map((memory) => (
                  <div key={memory.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <h3 className="font-semibold text-white">{memory.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-white/58">{memory.body}</p>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="py-10">
            <SectionHeading eyebrow="Profiles" title="Humans and AI agents evolve inside the same operating system." />
            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {profileTypes.map((profile) => (
                <article key={profile.title} className="enterprise-glass rounded-2xl border border-white/10 p-6">
                  <h3 className="text-xl font-bold text-white">{profile.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">{profile.body}</p>
                </article>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">Employee roles</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {employeeExamples.map((role) => (
                  <span key={role} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/65">
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="py-10">
            <SectionHeading eyebrow="AI Agents" title="Digital employees collaborate with human teams." />
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {agents.map((agent) => (
                <article key={agent.name} className="card-shimmer enterprise-glass rounded-2xl border border-white/10 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300/60">{agent.role}</p>
                  <h3 className="mt-3 text-xl font-bold text-white">{agent.name}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-white/60">
                    {agent.responsibilities.map((responsibility) => (
                      <li key={responsibility} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300/70" />
                        <span>{responsibility}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          <section className="grid gap-5 py-10 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="enterprise-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300/70">Owner objective</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">Build Sentra Software Deployment Module</h2>
              <p className="mt-4 text-sm leading-7 text-white/62">
                The owner manages outcomes, not tasks. SAI transforms the business objective into requirements,
                architecture, work, tests, release controls, and archived knowledge.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {objectiveAutomation.map((item, index) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-semibold text-cyan-200/70">Step {index + 1}</p>
                    <p className="mt-1 text-sm text-white/75">{item}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="enterprise-glass rounded-[2rem] border border-white/10 p-6 md:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300/70">Task Lifecycle</p>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">No work gets stuck.</h2>
              <div className="mt-6 grid gap-3">
                {lifecycle.map((stage, index) => (
                  <div key={stage} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-purple-500/40 to-cyan-500/40 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-white/75">{stage}</span>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="pb-14 pt-10">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-r from-indigo-500/20 via-cyan-500/10 to-purple-500/20 p-6 md:p-8">
              <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/70">Digital Company Twin</p>
                  <h2 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-5xl">
                    A live model of products, people, revenue, customers, risks, deadlines, and knowledge.
                  </h2>
                  <p className="mt-5 text-sm leading-7 text-white/65">
                    The founder enters business objectives. SAI turns them into execution, coordinates the company,
                    preserves memory, and keeps the owner focused on strategy.
                  </p>
                </div>
                <div className="grid gap-3">
                  {twinQuestions.map((question) => (
                    <div key={question} className="rounded-2xl border border-white/10 bg-[#050510]/55 p-4 text-sm font-semibold text-white/75">
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </SaiAuthGate>
  );
}

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
};

function SectionHeading({ eyebrow, title }: SectionHeadingProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300/70">{eyebrow}</p>
      <h2 className="mt-3 max-w-4xl text-3xl font-bold tracking-tight text-white md:text-5xl">{title}</h2>
    </div>
  );
}
