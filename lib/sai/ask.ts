import {
  agents,
  employees,
  memoryRecords,
  metrics,
  objectives,
  projects,
  tasks,
  displayName,
} from "./data";

export type AskResult = {
  headline: string;
  body: string[];
  bullets?: { label: string; value?: string }[];
  source: string;
};

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export const SUGGESTED_QUESTIONS = [
  "What should I work on today?",
  "Why is Sentra delayed?",
  "Show all open bugs.",
  "Which projects are at risk?",
  "What did the engineering team complete this week?",
  "Generate a roadmap for Unite.",
];

export function askSai(query: string): AskResult {
  const q = query.trim().toLowerCase();

  if (!q) {
    return {
      headline: "Ask SAI anything about your company.",
      body: ["Try one of the suggested questions, or ask about projects, people, agents, revenue, bugs, or risks."],
      source: "SAI Brain",
    };
  }

  // What should I work on today?
  if (/(work on|today|priorit|focus)/.test(q)) {
    const critical = tasks.filter((t) => t.priority === "critical" || t.priority === "high");
    const active = critical
      .filter((t) => ["In Progress", "Code Review", "Assigned", "Ready", "Testing", "Approval"].includes(t.stage))
      .slice(0, 5);
    return {
      headline: "Here is what SAI recommends focusing on today.",
      body: [
        "Based on priority, stage, and current workload balance across the company, these are the highest-leverage items.",
      ],
      bullets: active.map((t) => ({
        label: `${t.title} (${t.stage})`,
        value: `${displayName(t.assignee)} · ${t.priority}`,
      })),
      source: "SAI Brain · Team Orchestrator Agent",
    };
  }

  // Why is X delayed / Sentra delayed
  if (/(delay|late|slip|behind|why is)/.test(q)) {
    const named = projects.find((p) => q.includes(p.name.toLowerCase()) || q.includes(p.product.toLowerCase()));
    const target = named ?? projects.find((p) => p.status === "at-risk") ?? projects[0];
    return {
      headline: `Why ${target.product} is moving the way it is.`,
      body: [
        `${target.name} is currently ${target.status} at ${target.progress}% with a ${target.health.toUpperCase()} health signal.`,
        target.status === "active" && target.health === "green"
          ? "It is actually on track, but the following risks could cause slippage if unmanaged:"
          : "The Project Manager Agent attributes the current pace to these risks:",
      ],
      bullets: target.risks.map((r) => ({ label: r })),
      source: `SAI Brain · Project Manager Agent · ${target.name}`,
    };
  }

  // Open bugs
  if (/(bug|defect|issue|broken)/.test(q)) {
    const bugs = tasks.filter((t) => t.type === "bug" && t.stage !== "Knowledge Archived");
    return {
      headline: `There ${bugs.length === 1 ? "is" : "are"} ${bugs.length} open bug${bugs.length === 1 ? "" : "s"} plus ${metrics.openIssues} tracked issues.`,
      body: ["Open bugs currently in the lifecycle:"],
      bullets: bugs.map((b) => ({
        label: `${b.title}`,
        value: `${b.stage} · ${displayName(b.assignee)} · ${b.priority}`,
      })),
      source: "SAI Brain · QA Engineer Agent",
    };
  }

  // Projects at risk
  if (/(at risk|risk|in danger|failing|red)/.test(q)) {
    const risky = projects.filter((p) => p.status === "at-risk" || p.health === "red" || p.health === "yellow");
    return {
      headline: `${risky.length} project${risky.length === 1 ? "" : "s"} need attention.`,
      body: ["Projects with a yellow or red health signal:"],
      bullets: risky.map((p) => ({
        label: `${p.name} — ${p.health.toUpperCase()}`,
        value: `${p.progress}% · owner ${p.owner}`,
      })),
      source: "SAI Brain · COO Agent",
    };
  }

  // Engineering completed this week
  if (/(complete|finish|done|ship|deliver)/.test(q)) {
    const completed = tasks.filter((t) => ["Released", "Knowledge Archived", "Approval"].includes(t.stage));
    return {
      headline: "Recently completed and verified work.",
      body: ["Work that reached release, approval, or knowledge-archive stage:"],
      bullets: completed.map((t) => ({
        label: t.title,
        value: `${t.stage} · ${displayName(t.assignee)}`,
      })),
      source: "SAI Brain · Project Manager Agent",
    };
  }

  // Roadmap for X
  if (/(roadmap|plan|sequence|timeline)/.test(q)) {
    const named = projects.find((p) => q.includes(p.name.toLowerCase()) || q.includes(p.product.toLowerCase()));
    const target = named ?? projects.find((p) => p.product.toLowerCase() === "unite") ?? projects[1];
    return {
      headline: `Generated roadmap for ${target.product}.`,
      body: [target.summary, `Target window: ${target.start} → ${target.target}.`],
      bullets: target.artifacts.map((a) => ({
        label: a.label,
        value: `${a.status} — ${a.detail}`,
      })),
      source: `SAI Brain · Product Manager Agent · ${target.name}`,
    };
  }

  // Overloaded engineer
  if (/(overload|too much|burnout|capacity|busiest)/.test(q)) {
    const ranked = [...employees].sort((a, b) => b.metrics.activeTasks - a.metrics.activeTasks);
    const top = ranked[0];
    return {
      headline: `${top.name} is carrying the most active work.`,
      body: [
        `${top.name} (${top.role}) has ${top.metrics.activeTasks} active tasks. The Team Orchestrator Agent is rebalancing to reduce context switching.`,
      ],
      bullets: ranked.slice(0, 4).map((e) => ({
        label: e.name,
        value: `${e.metrics.activeTasks} active tasks · ${Math.round(e.metrics.onTimeRate * 100)}% on-time`,
      })),
      source: "SAI Brain · Team Orchestrator Agent",
    };
  }

  // Revenue
  if (/(revenue|money|sales|income|arr|pipeline|grow)/.test(q)) {
    return {
      headline: `Revenue is ${fmtCurrency(metrics.revenue)} this quarter, ${metrics.revenueDeltaPct > 0 ? "up" : "down"} ${Math.abs(metrics.revenueDeltaPct)}%.`,
      body: ["The CEO Agent summary of business performance:"],
      bullets: memoryRecords
        .filter((m) => m.type === "business")
        .map((m) => ({ label: m.title, value: m.summary })),
      source: "SAI Brain · CEO Agent",
    };
  }

  // Objectives
  if (/(objective|goal|target|mission)/.test(q)) {
    return {
      headline: "Current company objectives.",
      body: ["The owner sets objectives; SAI turns them into execution."],
      bullets: objectives.map((o) => ({ label: o.title, value: `${o.status} · ${o.progress}%` })),
      source: "SAI Brain",
    };
  }

  // Agents
  if (/(agent|ai team|digital employee)/.test(q)) {
    return {
      headline: `${agents.filter((a) => a.status === "active").length} AI agents are active.`,
      body: ["Your digital workforce, working alongside the human team:"],
      bullets: agents.map((a) => ({ label: a.name, value: a.tagline })),
      source: "SAI Brain",
    };
  }

  // Fallback: keyword search across memory + projects
  const matches = memoryRecords.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.summary.toLowerCase().includes(q) ||
      m.tags.some((t) => q.includes(t)),
  );
  if (matches.length) {
    return {
      headline: "Here is what the company memory knows.",
      body: ["SAI searched product, engineering, customer, decision, and business memory:"],
      bullets: matches.map((m) => ({ label: m.title, value: m.summary })),
      source: "SAI Brain · Company Memory",
    };
  }

  return {
    headline: "SAI does not have a confident answer yet.",
    body: [
      "Try asking about projects, risks, bugs, revenue, objectives, the team, or roadmaps.",
      "For example: \"Why is Sentra delayed?\" or \"Which projects are at risk?\"",
    ],
    source: "SAI Brain",
  };
}
