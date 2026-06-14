"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentFeed } from "@/components/sai/agent-feed";
import { AgentHierarchy } from "@/components/sai/agent-hierarchy";
import { EmployeesView } from "@/components/sai/employees-view";
import { ORGANIZATION_DEPARTMENTS } from "@/lib/sai/organization-constants";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type {
  Agent,
  AgentHandlingStatus,
  AgentStatus,
  OrganizationHeadquartersData,
  OrganizationSection,
  OrganizationSessionWorkspace,
  PriorityLevel,
  Project,
} from "@/lib/sai/types";

type Props = {
  data: OrganizationHeadquartersData;
  section: OrganizationSection | null;
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

const handlingStyles: Record<AgentHandlingStatus, string> = {
  running: "bg-emerald-400/20 text-emerald-300 border-emerald-400/30",
  waiting: "bg-amber-400/15 text-amber-200 border-amber-400/25",
  review: "bg-purple-400/15 text-purple-200 border-purple-400/30",
  completed: "bg-cyan-400/15 text-cyan-200 border-cyan-400/25",
  idle: "bg-white/5 text-white/40 border-white/10",
};

const healthDot = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-400",
};

const SECTION_TITLES: Record<OrganizationSection, string> = {
  "agent-center": "Agent Center",
  "active-sessions": "Active Sessions",
  "agent-workspaces": "Agent Workspaces",
  departments: "Departments",
  employees: "Employees",
  capacity: "Capacity & Workload",
  structure: "Organization Structure",
};

type FormState = {
  name: string;
  role: string;
  department: string;
  description: string;
  status: AgentStatus;
  priorityLevel: PriorityLevel;
};

const emptyForm: FormState = {
  name: "",
  role: "",
  department: "Engineering",
  description: "",
  status: "active",
  priorityLevel: "medium",
};

function formatTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function DashboardCards({ data }: { data: OrganizationHeadquartersData["dashboard"] }) {
  const cards = [
    { label: "Total Agents", value: data.totalAgents },
    { label: "Active", value: data.activeAgents },
    { label: "Idle", value: data.idleAgents },
    { label: "On Session", value: data.assignedAgents },
    { label: "Departments", value: data.departmentCoverage },
    { label: "AI Health", value: `${data.aiHealthScore}%` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">{card.label}</p>
          <p className="mt-1 text-xl font-bold text-white">{card.value}</p>
        </div>
      ))}
    </div>
  );
}

function ActionCenter({ items }: { items: OrganizationHeadquartersData["actionCenter"] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-white/40">
        No session activity yet. Launch an objective from Founder Workspace to start execution.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs text-white/50">{item.description}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/35">
                {item.sessionNumber != null && <span>Session #{item.sessionNumber}</span>}
                {item.projectName && <span>{item.projectName}</span>}
                {item.agentName && <span>{item.agentName}</span>}
                <span className="uppercase">{item.status.replace(/_/g, " ")}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              <time className="text-[10px] text-white/35">{formatTime(item.timestamp)}</time>
              {item.href && (
                <Link href={item.href} className="text-[10px] text-purple-300 hover:text-purple-200">
                  Open →
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AgentCenterTable({
  rows,
  isAdmin,
  supabaseConfigured,
  projects,
  onAgentCreated,
}: {
  rows: OrganizationHeadquartersData["agents"];
  isAdmin: boolean;
  supabaseConfigured: boolean;
  projects: Project[];
  onAgentCreated: (agent: Agent) => void;
}) {
  const router = useRouter();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sai/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          responsibilities: [],
          skills: [],
          toolsAccess: [],
          objectives: [],
          projectIds: [],
          memoryEnabled: true,
          approvalRequired: false,
          performanceScore: 80,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || "Failed to create agent");
        return;
      }
      onAgentCreated(payload.agent);
      setFormOpen(false);
      setForm(emptyForm);
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40";

  return (
    <div className="space-y-4">
      {isAdmin && supabaseConfigured && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/45">Session-oriented workforce — live execution status per agent</p>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white"
          >
            + Create Agent
          </button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleCreate} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">Create Agent</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Role</span>
              <input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Department</span>
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={`${inputClass} bg-[#0d0d14]`}>
                {ORGANIZATION_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Description</span>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
              Save Agent
            </button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">
              Cancel
            </button>
          </div>
          {projects.length > 0 && (
            <p className="mt-3 text-[10px] text-white/35">Assign projects after creation from the agent workspace.</p>
          )}
        </form>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-white/40">
            <tr>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Session / Project</th>
              <th className="px-4 py-3">Workflow Step</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next</th>
              <th className="px-4 py-3">COO Review</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-white/40">
                  No agents yet. Create your first digital employee.
                </td>
              </tr>
            ) : (
              rows.map(({ agent, liveSession, workload, metrics, aiHealth }) => (
                <tr key={agent.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <p className="font-medium text-white">{agent.name}</p>
                    <p className="text-[10px] text-purple-300/70">{agent.role}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">{agent.department || "—"}</td>
                  <td className="px-4 py-3">
                    {liveSession.sessionId ? (
                      <div>
                        <Link href={`/sai/sessions/${liveSession.sessionId}`} className="text-xs text-cyan-300 hover:underline">
                          #{liveSession.sessionNumber ?? "—"} · {liveSession.projectName ?? "Project"}
                        </Link>
                        <p className="mt-0.5 line-clamp-1 text-[10px] text-white/40">{liveSession.objective}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-white/35">No active session</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/60">
                    {liveSession.currentStep ?? liveSession.workflowStage ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase ${handlingStyles[liveSession.handlingStatus]}`}>
                      {liveSession.handlingStatus}
                    </span>
                    <p className="mt-1 text-[10px] text-white/35">{workload.utilization}% util</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/55">{liveSession.nextStep ?? "—"}</td>
                  <td className="px-4 py-3 text-xs">
                    {liveSession.cooReviewPending > 0 ? (
                      <span className="text-amber-300">{liveSession.cooReviewLabel}</span>
                    ) : (
                      <span className="text-white/30">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${healthDot[aiHealth]}`} />
                      <span className="text-xs text-white/60">
                        {metrics?.scores.overallScore ?? agent.performanceScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sai/organization/agents/${agent.id}/workspace`}
                      className="text-[10px] font-medium text-purple-300 hover:text-purple-200"
                    >
                      Workspace →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActiveSessionsPanel({ sessions }: { sessions: OrganizationHeadquartersData["activeSessions"] }) {
  if (sessions.length === 0) {
    return (
      <section className="enterprise-glass rounded-xl border border-white/10 p-8 text-center">
        <p className="text-white/50">No active sessions running.</p>
        <Link href="/sai/founder" className="mt-3 inline-block text-sm text-purple-300 hover:underline">
          Launch from Founder Workspace
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <section key={session.workflow.id} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase text-purple-300/70">
                Session #{session.workflow.sessionNumber ?? "—"} · {session.workflow.projectName}
              </p>
              <h3 className="mt-1 text-lg font-semibold text-white">{session.workflow.objective}</h3>
              <p className="mt-1 text-xs text-white/45">
                {session.workflow.currentStage ?? "In progress"} · {session.progressPercent}% complete
              </p>
            </div>
            <Link href={`/sai/sessions/${session.workflow.id}`} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:border-purple-400/40">
              Open Session
            </Link>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Current Agent</p>
              <p className="text-sm text-white">{session.currentAgentName ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Next Agent</p>
              <p className="text-sm text-white">{session.nextAgentName ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">COO Reviews</p>
              <p className="text-sm text-amber-300">{session.pendingApprovals}</p>
            </div>
            <div className="rounded-lg bg-white/[0.03] p-3">
              <p className="text-[10px] text-white/40">Tasks</p>
              <p className="text-sm text-white">{session.tasksComplete}/{session.tasksTotal}</p>
            </div>
          </div>
          {session.agentFeed.length > 0 && (
            <div className="mt-4">
              <AgentFeed items={session.agentFeed.slice(0, 5)} showApprovalActions />
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

const workspaceBucketStyles: Record<string, string> = {
  active: "text-emerald-300",
  awaiting_approval: "text-amber-300",
  scheduled: "text-cyan-300",
  blocked: "text-red-300",
  completed: "text-purple-300",
  archived: "text-white/40",
  cancelled: "text-white/30",
};

function SessionWorkspacesPanel({ workspaces }: { workspaces: OrganizationSessionWorkspace[] }) {
  if (!workspaces.length) {
    return (
      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h3 className="text-sm font-semibold text-white">Session Workspaces</h3>
        <p className="mt-2 text-sm text-white/45">
          No session workspaces yet. Create a session in Session Center to spawn a dedicated execution workspace.
        </p>
        <Link href="/sai/sessions?section=registry-all" className="mt-3 inline-block text-xs text-purple-300 hover:underline">
          Open Session Center →
        </Link>
      </section>
    );
  }

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">Session Workspaces</h3>
          <p className="mt-1 text-xs text-white/45">
            Each COS session has a dedicated workspace — status, execution, artifacts, and executive outcomes.
          </p>
        </div>
        <Link href="/sai/sessions?section=registry-all" className="text-xs text-purple-300 hover:underline">
          Session registry →
        </Link>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((ws) => (
          <li key={ws.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3 transition-colors hover:border-purple-400/25">
            <Link href={ws.href} className="block">
              <p className="text-[10px] uppercase tracking-wider text-cyan-300/70">
                Session #{ws.sessionNumber ?? "—"} · {ws.projectName}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-white">{ws.objective}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                <span className={workspaceBucketStyles[ws.bucket] ?? "text-white/50"}>
                  {ws.bucket.replace(/_/g, " ")}
                </span>
                <span className="text-white/35">·</span>
                <span className="text-white/50">{ws.currentAgentName ?? "Unassigned"}</span>
                <span className="text-white/35">·</span>
                <span className="text-white/50">{ws.executionHealth}% health</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AgentWorkspacesByDepartment({ rows }: { rows: OrganizationHeadquartersData["agents"] }) {
  const groups = useMemo(() => {
    const map = new Map<string, OrganizationHeadquartersData["agents"]>();
    for (const row of rows) {
      const dept = row.agent.department || "Unassigned";
      if (!map.has(dept)) map.set(dept, []);
      map.get(dept)!.push(row);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="space-y-4">
      {groups.map(([dept, deptRows]) => (
        <section key={dept} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">{dept}</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {deptRows.map(({ agent, liveSession }) => (
              <li key={agent.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <Link href={`/sai/organization/agents/${agent.id}/workspace`} className="text-sm font-medium text-white hover:text-purple-200">
                  {agent.name}
                </Link>
                <p className="text-[10px] text-purple-300/70">{agent.role}</p>
                <p className="mt-2 text-[10px] text-white/40">
                  {liveSession.sessionId
                    ? `Session #${liveSession.sessionNumber} · ${liveSession.handlingStatus}`
                    : "Idle — no active session"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function DepartmentsPanel({ departments }: { departments: OrganizationHeadquartersData["departments"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {departments.map((dept) => (
        <article key={dept.name} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{dept.name}</h3>
            <span className={`h-2.5 w-2.5 rounded-full ${healthDot[dept.healthStatus]}`} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/55">
            <span>{dept.agentCount} agents</span>
            <span>{dept.employeeCount} employees</span>
            <span>{dept.activeSessions} sessions</span>
            <span>{dept.assignedAgents} on session</span>
          </div>
          <p className="mt-3 text-[10px] text-white/40">Health {dept.healthScore}%</p>
        </article>
      ))}
    </div>
  );
}

function CapacityPanel({ rows }: { rows: OrganizationHeadquartersData["agents"] }) {
  const byDept = useMemo(() => {
    const map = new Map<string, { util: number; count: number; running: number }>();
    for (const row of rows) {
      const dept = row.agent.department || "Unassigned";
      const entry = map.get(dept) ?? { util: 0, count: 0, running: 0 };
      entry.util += row.workload.utilization;
      entry.count += 1;
      if (row.liveSession.handlingStatus === "running") entry.running += 1;
      map.set(dept, entry);
    }
    return [...map.entries()].map(([name, v]) => ({
      name,
      avgUtil: v.count ? Math.round(v.util / v.count) : 0,
      running: v.running,
      count: v.count,
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      {byDept.map((dept) => (
        <div key={dept.name} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{dept.name}</h3>
            <span className="text-xs text-white/50">{dept.running}/{dept.count} running</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400" style={{ width: `${dept.avgUtil}%` }} />
          </div>
          <p className="mt-2 text-xs text-white/45">{dept.avgUtil}% average utilization</p>
        </div>
      ))}
    </div>
  );
}

export function OrganizationView({
  data,
  section,
  isAdmin,
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const { connected } = useSaiRealtimeSync(
    () => router.refresh(),
    ["workflow_runs", "workflow_run_steps", "workflow_approvals", "activity_feed", "agent_runtime_sessions", "orchestration_runs"],
    { debounceMs: 5000, minIntervalMs: 20_000 },
  );

  const activeSection = section ?? "agent-center";
  const title = SECTION_TITLES[activeSection] ?? "Organization";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
            Workforce Headquarters
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">
            Session-oriented execution — live project sessions, agent workflow status, COO reviews, and workforce capacity.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-white/40">
          <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
          {connected ? "Live sync" : "Polling every 12s"}
        </div>
      </header>

      {(activeSection === "agent-center" || !section) && (
        <>
          <DashboardCards data={data.dashboard} />
          <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
            <h2 className="text-sm font-semibold text-white">Action Center</h2>
            <p className="mt-1 text-xs text-white/45">All session-based activity — running work, reviews, decisions, completions</p>
            <div className="mt-4">
              <ActionCenter items={data.actionCenter} />
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Agent Roster</h2>
            <AgentCenterTable
              rows={data.agents}
              isAdmin={isAdmin}
              supabaseConfigured={supabaseConfigured}
              projects={data.projects}
              onAgentCreated={() => router.refresh()}
            />
          </section>
        </>
      )}

      {activeSection === "active-sessions" && <ActiveSessionsPanel sessions={data.activeSessions} />}

      {activeSection === "agent-workspaces" && (
        <div className="space-y-6">
          <SessionWorkspacesPanel workspaces={data.sessionWorkspaces} />
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">Agent Role Workspaces</h2>
            <p className="mb-4 text-xs text-white/45">
              Per-agent views — linked to live sessions when an agent is assigned.
            </p>
            <AgentWorkspacesByDepartment rows={data.agents} />
          </section>
        </div>
      )}

      {activeSection === "departments" && <DepartmentsPanel departments={data.departments} />}

      {activeSection === "employees" && (
        <EmployeesView
          initialEmployees={data.employees}
          isAdmin={isAdmin}
          supabaseConfigured={supabaseConfigured}
        />
      )}

      {activeSection === "capacity" && <CapacityPanel rows={data.agents} />}

      {activeSection === "structure" && (
        <AgentHierarchy
          agents={data.agents.map((r) => r.agent)}
          founderName={data.founderName}
        />
      )}
    </div>
  );
}
