import type {
  AIAgent,
  CompanyOverview,
  Employee,
  HealthMetric,
  MemoryRecord,
} from "./types";

export const companyOverview: CompanyOverview = {
  activeProjects: 0,
  employeesOnline: 0,
  totalEmployees: 0,
  aiAgentsActive: 0,
  totalAgents: 0,
  tasksInProgress: 0,
  releases: 0,
  openIssues: 0,
  currentObjectives: [],
  organizationHealthScore: 0,
};

export const healthMetrics: HealthMetric[] = [
  {
    id: "engineering",
    label: "Engineering Health",
    status: "yellow",
    score: 72,
    explanation:
      "Sentra deployment module is 5 days behind schedule. Code review queue has 6 pending PRs. Test coverage dropped 3% this sprint.",
  },
  {
    id: "product",
    label: "Product Health",
    status: "green",
    score: 86,
    explanation:
      "Roadmap alignment is strong. HYGYR user feedback scores improved 18%. Feature prioritization aligned with Q2 objectives.",
  },
  {
    id: "revenue",
    label: "Revenue Health",
    status: "green",
    score: 81,
    explanation:
      "MRR growing at 12.4% month-over-month. Sentra enterprise pipeline has 4 qualified leads. Churn remains below 2%.",
  },
  {
    id: "customer",
    label: "Customer Health",
    status: "yellow",
    score: 68,
    explanation:
      "3 enterprise customers flagged support escalations. FaceNova onboarding feedback cites documentation gaps. NPS at 42.",
  },
  {
    id: "operations",
    label: "Operations Health",
    status: "green",
    score: 79,
    explanation:
      "Team utilization at 78%. Sprint velocity stable. Resource allocation balanced across Sentra and FaceNova.",
  },
  {
    id: "knowledge",
    label: "Knowledge Health",
    status: "yellow",
    score: 65,
    explanation:
      "142 memory records indexed. 23% of engineering decisions lack documentation. Architecture docs for Unite incomplete.",
  },
];

export const aiAgents: AIAgent[] = [
  {
    id: "ceo",
    name: "CEO Agent",
    role: "Chief Executive",
    responsibilities: ["Revenue tracking", "Market trends", "Business risks", "Growth opportunities"],
    status: "active",
    assignedProjects: 4,
    performanceScore: 92,
  },
  {
    id: "coo",
    name: "COO Agent",
    role: "Chief Operating Officer",
    responsibilities: ["Team productivity", "Resource allocation", "Delivery performance"],
    status: "active",
    assignedProjects: 4,
    performanceScore: 88,
  },
  {
    id: "pm",
    name: "Product Manager Agent",
    role: "Product Management",
    responsibilities: ["Requirements", "User stories", "Acceptance criteria"],
    status: "busy",
    assignedProjects: 3,
    performanceScore: 85,
  },
  {
    id: "architect",
    name: "Solution Architect Agent",
    role: "Architecture",
    responsibilities: ["System design", "API contracts", "Security models", "Scaling plans"],
    status: "active",
    assignedProjects: 2,
    performanceScore: 90,
  },
  {
    id: "project-mgr",
    name: "Project Manager Agent",
    role: "Project Management",
    responsibilities: ["Timelines", "Dependencies", "Risk tracking", "Progress reporting"],
    status: "busy",
    assignedProjects: 4,
    performanceScore: 87,
  },
  {
    id: "orchestrator",
    name: "Team Orchestrator Agent",
    role: "Work Routing",
    responsibilities: ["Task assignment", "Workload balancing", "Escalation handling"],
    status: "active",
    assignedProjects: 4,
    performanceScore: 91,
  },
  {
    id: "engineer",
    name: "Software Engineer Agent",
    role: "Engineering",
    responsibilities: ["Feature implementation", "Code ownership", "Technical decisions"],
    status: "busy",
    assignedProjects: 2,
    performanceScore: 84,
  },
  {
    id: "qa",
    name: "QA Engineer Agent",
    role: "Quality Assurance",
    responsibilities: ["Test plans", "Bug reports", "Regression testing", "Acceptance verification"],
    status: "active",
    assignedProjects: 3,
    performanceScore: 86,
  },
  {
    id: "devops",
    name: "DevOps Agent",
    role: "DevOps",
    responsibilities: ["CI/CD", "Infrastructure", "Monitoring", "Releases"],
    status: "active",
    assignedProjects: 2,
    performanceScore: 89,
  },
  {
    id: "security",
    name: "Security Agent",
    role: "Security",
    responsibilities: ["Vulnerability detection", "Security reviews", "Compliance checks"],
    status: "idle",
    assignedProjects: 1,
    performanceScore: 93,
  },
  {
    id: "docs",
    name: "Documentation Agent",
    role: "Documentation",
    responsibilities: ["Technical docs", "User docs", "Release notes"],
    status: "active",
    assignedProjects: 3,
    performanceScore: 80,
  },
  {
    id: "cs",
    name: "Customer Success Agent",
    role: "Customer Success",
    responsibilities: ["Customer issues", "Feature requests", "Satisfaction tracking"],
    status: "active",
    assignedProjects: 2,
    performanceScore: 82,
  },
  {
    id: "sales",
    name: "Sales Agent",
    role: "Sales",
    responsibilities: ["Leads", "Opportunities", "Revenue pipeline"],
    status: "active",
    assignedProjects: 1,
    performanceScore: 78,
  },
  {
    id: "marketing",
    name: "Marketing Agent",
    role: "Marketing",
    responsibilities: ["Campaigns", "Content", "Growth activities", "Brand monitoring"],
    status: "idle",
    assignedProjects: 1,
    performanceScore: 75,
  },
  {
    id: "hr",
    name: "HR Agent",
    role: "Human Resources",
    responsibilities: ["Employee tracking", "Performance", "Hiring needs", "Training"],
    status: "active",
    assignedProjects: 1,
    performanceScore: 83,
  },
];

export const employees: Employee[] = [
  { id: "e1", name: "Arjun Mehta", role: "Software Engineer", department: "Engineering", status: "online", currentWork: "Sentra deployment module" },
  { id: "e2", name: "Priya Sharma", role: "Product Manager", department: "Product", status: "online", currentWork: "HYGYR premium tier spec" },
  { id: "e3", name: "Rahul Verma", role: "QA Engineer", department: "Engineering", status: "busy", currentWork: "FaceNova v2 regression suite" },
  { id: "e4", name: "Sneha Patel", role: "DevOps Engineer", department: "Engineering", status: "online", currentWork: "CI/CD pipeline optimization" },
  { id: "e5", name: "Vikram Singh", role: "Sales Executive", department: "Sales", status: "offline", currentWork: "Enterprise lead follow-ups" },
  { id: "e6", name: "Ananya Reddy", role: "Marketing Lead", department: "Marketing", status: "online", currentWork: "Q2 content calendar" },
  { id: "e7", name: "Karthik Nair", role: "Software Engineer", department: "Engineering", status: "busy", currentWork: "Unite architecture review" },
];

export const memoryRecords: MemoryRecord[] = [
  {
    id: "m1",
    type: "decision",
    title: "Chose gRPC over REST for Sentra agent communication",
    summary: "Lower latency and bidirectional streaming required for real-time endpoint updates.",
    date: "2026-05-12",
  },
  {
    id: "m2",
    type: "customer",
    title: "Acme Corp requested bulk deployment scheduling",
    summary: "Enterprise customer needs off-hours deployment windows across 2,400 endpoints.",
    date: "2026-05-18",
  },
  {
    id: "m3",
    type: "engineering",
    title: "FaceNova camera failover architecture",
    summary: "Implemented redundant camera streams with automatic failover to prevent attendance gaps.",
    date: "2026-04-22",
  },
  {
    id: "m4",
    type: "business",
    title: "HYGYR freemium conversion strategy",
    summary: "Premium tier targets power users with 3+ resume versions. Projected 4.2% conversion.",
    date: "2026-05-01",
  },
  {
    id: "m5",
    type: "product",
    title: "Sentra deployment rollback requirement",
    summary: "All deployments must support one-click rollback within 30 seconds for enterprise SLA.",
    date: "2026-05-20",
  },
];

export const askSAIExamples = [
  "What should I work on today?",
  "Why is Sentra delayed?",
  "Show all open bugs.",
  "Which projects are at risk?",
  "What did the engineering team complete this week?",
  "Generate a roadmap for Unite.",
];

export function getSAIResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.includes("work on today") || q.includes("should i work")) {
    return `Based on current priorities and your role as Owner, I recommend focusing on:

1. **Sentra Deployment Module** — This project is 5 days behind schedule. The blocker is the rollback mechanism (3 open tasks in Code Review). Approving the architecture decision on rollback SLA would unblock 2 engineers.

2. **Unite Platform** — At risk with only 28% progress. The Solution Architect Agent has flagged missing API contracts. A 30-minute review session would accelerate Phase 1.

3. **Open Issues** — 18 issues across products. 4 are P1 (2 in Sentra, 1 in FaceNova, 1 in HYGYR).

Your highest-impact action today: unblock Sentra's rollback PR and schedule the Unite architecture review.`;
  }

  if (q.includes("sentra") && (q.includes("delay") || q.includes("why"))) {
    return `**Sentra Deployment Module** is delayed by approximately 5 days. Here's why:

**Root Causes:**
- Rollback mechanism design took 3 extra days (engineering memory: enterprise SLA requires <30s rollback)
- 6 PRs stuck in code review queue — team capacity split with Unite
- QA Engineer Agent flagged 4 regression failures in deployment scheduling

**Impact:**
- 62% complete (21/34 tasks)
- 2 dependent tasks blocked in FaceNova integration
- Enterprise customer Acme Corp deployment window at risk (June 15)

**Recommendations:**
1. Prioritize rollback PR review today
2. Reassign 1 engineer from HYGYR to Sentra for this sprint
3. Schedule deployment dry-run with DevOps Agent

The Project Manager Agent is tracking 3 mitigation actions.`;
  }

  if (q.includes("open bug") || q.includes("bugs")) {
    return `**18 Open Issues** across the company:

**P1 — Critical (4)**
- SEN-142: Deployment rollback fails on Windows endpoints
- SEN-138: Agent heartbeat timeout under load
- FNV-89: Camera failover gap during network switch
- HYG-45: PDF export corrupts special characters

**P2 — High (7)**
- SEN-140, SEN-135, FNV-85, FNV-82, HYG-42, UNI-12, UNI-08

**P3 — Medium (7)**
- Various UI and documentation issues

QA Engineer Agent reports 67% of P1 bugs are in testing stage. Sentra accounts for 44% of all open issues.`;
  }

  if (q.includes("at risk") || q.includes("risk")) {
    return `**Projects at Risk:**

🔴 **Unite Platform** — 28% complete, at risk
- Missing API contracts blocking 8 tasks
- Only 1 engineer assigned (Karthik Nair)
- Architecture docs incomplete (Knowledge Health: yellow)

🟡 **Sentra Deployment Module** — 62% complete, delayed
- 5 days behind schedule
- Rollback mechanism blocker
- Enterprise SLA deadline approaching

🟢 **FaceNova v2 Dashboard** — 78% complete, on track
🟢 **HYGYR Premium Tier** — 45% complete, on track

**Risk Summary:** 2 of 4 active projects need immediate attention. Engineering Health is yellow primarily due to Sentra delays.`;
  }

  if (q.includes("engineering") && (q.includes("complete") || q.includes("week"))) {
    return `**Engineering Team — This Week's Completions:**

✅ **Merged & Released**
- FaceNova multi-camera sync optimization (Arjun Mehta)
- HYGYR template engine refactor (Karthik Nair)
- Sentra agent auto-update mechanism v1 (Sneha Patel)

✅ **In Code Review**
- Sentra deployment rollback mechanism (Arjun Mehta)
- FaceNova analytics API endpoints (Karthik Nair)

✅ **Testing Complete**
- HYGYR PDF export fix (Rahul Verma)
- Sentra endpoint grouping feature (Sneha Patel)

**Metrics:** 14 tasks completed, 6 in review, sprint velocity 82% of target. Software Engineer Agent memory updated with 8 new technical decisions.`;
  }

  if (q.includes("roadmap") && q.includes("unite")) {
    return `**Unite Platform — Proposed Roadmap**

**Phase 1: Foundation (Current — 28%)**
- Core architecture and API contracts
- Authentication and role-based access
- Company data model and memory system
- *Target: June 30, 2026*

**Phase 2: Intelligence Layer**
- SAI Brain integration with all company data
- Ask SAI natural language queries
- Automated task routing via Team Orchestrator
- *Target: August 15, 2026*

**Phase 3: Autonomous Execution**
- Agent-driven project lifecycle automation
- Self-healing operations and deployment
- Predictive risk detection
- *Target: October 1, 2026*

**Phase 4: Digital Twin**
- Full company simulation and what-if analysis
- Revenue impact modeling
- Strategic recommendation engine
- *Target: Q4 2026*

**Immediate Actions:** Complete API contracts (blocks 8 tasks), add second engineer, finalize architecture docs.`;
  }

  return `I've analyzed your query against the company's digital twin — projects, employees, agents, memory, and performance data.

**Current Company Snapshot:**
- 4 active projects, 2 need attention
- 7 employees online, 14 AI agents active
- Organization Health Score: 78/100
- Revenue: $284,500 (+12.4% MoM)

Could you be more specific? Try asking about:
- Project status or delays
- Open bugs or issues
- Team workload or completions
- Roadmaps and priorities
- Customer or revenue metrics

I have access to all company memory, decisions, and real-time operational data.`;
}
