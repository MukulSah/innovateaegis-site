import { SectionPage } from "@/components/sai/section-page";

const domains = [
  "Projects", "Tasks", "Products", "Employees", "Agents",
  "Customers", "Revenue", "Documentation", "Meetings", "Decisions",
];

export default function SAIBrainPage() {
  return (
    <SectionPage
      title="SAI Brain"
      subtitle="Central Intelligence"
      description="The central intelligence of the company. Everything reports here. SAI Brain continuously evaluates whether the organization is moving closer to its goals."
    >
      <div className="enterprise-glass rounded-2xl border border-purple-400/15 p-6">
        <h2 className="text-lg font-semibold text-white">Connected Domains</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {domains.map((domain) => (
            <span
              key={domain}
              className="rounded-full border border-purple-400/20 bg-purple-500/10 px-4 py-2 text-sm text-purple-200"
            >
              {domain}
            </span>
          ))}
        </div>
        <p className="mt-6 text-sm leading-relaxed text-white/55">
          SAI Brain ingests real-time data from every domain, correlates patterns across
          projects and teams, and surfaces insights through Ask SAI on the dashboard.
          Long-term, the brain will autonomously coordinate agent workflows and recommend
          strategic pivots based on company memory.
        </p>
      </div>
    </SectionPage>
  );
}
