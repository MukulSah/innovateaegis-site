import { AgentNetworkPanel } from "@/components/sai/agent-network-panel";
import { KnowledgeGraphPanel } from "@/components/sai/knowledge-graph-panel";
import { ProductIntelligencePanel } from "@/components/sai/product-intelligence-panel";
import { SectionPage } from "@/components/sai/section-page";
import { getAgentNetworkByType } from "@/lib/sai/agent-network";
import { buildKnowledgeGraph, getKnowledgeGraph } from "@/lib/sai/knowledge-graph";
import { getProducts } from "@/lib/sai/products";
import { getBrainStats } from "@/lib/sai/queries";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";

const domains = [
  "Projects", "Tasks", "Products", "Employees", "Agents",
  "Customers", "Revenue", "Documentation", "Meetings", "Decisions",
];

export default async function SAIBrainPage() {
  const companyId = await getCompanyId();

  await buildKnowledgeGraph();

  const [stats, counts, products, agentNetwork, graphEdges] = await Promise.all([
    getBrainStats(),
    Promise.all([
      prisma.project.count({ where: { companyId } }),
      prisma.task.count({ where: { project: { companyId } } }),
      prisma.user.count({ where: { companyId, role: "employee" } }),
      prisma.aIAgent.count({ where: { companyId } }),
      prisma.customer.count({ where: { companyId } }),
      prisma.decision.count({ where: { companyId } }),
      prisma.meeting.count({ where: { companyId } }),
      prisma.document.count({ where: { companyId } }),
    ]),
    getProducts(),
    getAgentNetworkByType(),
    getKnowledgeGraph(20),
  ]);

  const [projects, tasks, employees, agents, customers, decisions, meetings, documents] = counts;

  return (
    <SectionPage
      title="SAI Brain"
      subtitle="Central Intelligence & Digital Twin"
      description="The central intelligence of the company. Everything reports here. SAI Brain continuously evaluates whether the organization is moving closer to its goals."
    >
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.dataPoints}</p>
          <p className="text-[10px] text-white/40">Data Points</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{stats.memories}</p>
          <p className="text-[10px] text-white/40">Memories</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">Live</p>
          <p className="text-[10px] text-white/40">Digital Twin</p>
        </div>
        <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
          <p className="text-2xl font-bold text-white">{graphEdges.length}</p>
          <p className="text-[10px] text-white/40">Graph Edges</p>
        </div>
      </div>

      <ProductIntelligencePanel products={products} />

      <KnowledgeGraphPanel edges={graphEdges} />

      <AgentNetworkPanel
        discussions={agentNetwork.discussions}
        recommendations={agentNetwork.recommendations}
        decisions={agentNetwork.decisions}
        escalations={agentNetwork.escalations}
      />

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

        <div className="mt-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Projects", count: projects },
            { label: "Tasks", count: tasks },
            { label: "Employees", count: employees },
            { label: "AI Agents", count: agents },
            { label: "Customers", count: customers },
            { label: "Decisions", count: decisions },
            { label: "Meetings", count: meetings },
            { label: "Documents", count: documents },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-xs text-white/45">{item.label}</p>
              <p className="text-lg font-bold text-white">{item.count}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionPage>
  );
}
