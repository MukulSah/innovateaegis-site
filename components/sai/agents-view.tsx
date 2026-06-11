"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AgentHierarchy } from "@/components/sai/agent-hierarchy";
import { getReportingLabel } from "@/lib/sai/agent-hierarchy";
import type { Agent, AgentMemory, AgentStatus, PriorityLevel, Project } from "@/lib/sai/types";

const statusDot: Record<AgentStatus, string> = {
  active: "bg-emerald-400",
  busy: "bg-amber-400",
  idle: "bg-white/30",
  disabled: "bg-red-400/60",
};

const capacityDot: Record<string, string> = {
  AVAILABLE: "text-emerald-300",
  BUSY: "text-amber-300",
  OVERLOADED: "text-red-300",
  BLOCKED: "text-orange-300",
  OFFLINE: "text-white/30",
};

type Props = {
  initialAgents: Agent[];
  projects: Project[];
  isAdmin: boolean;
  founderName?: string;
  supabaseConfigured: boolean;
};

type FormState = {
  name: string;
  role: string;
  department: string;
  description: string;
  responsibilities: string;
  skills: string;
  toolsAccess: string;
  objectives: string;
  projectIds: string[];
  reportingAgentId: string;
  priorityLevel: PriorityLevel;
  memoryEnabled: boolean;
  approvalRequired: boolean;
  status: AgentStatus;
  performanceScore: string;
};

const emptyForm: FormState = {
  name: "",
  role: "",
  department: "",
  description: "",
  responsibilities: "",
  skills: "",
  toolsAccess: "",
  objectives: "",
  projectIds: [],
  reportingAgentId: "",
  priorityLevel: "medium",
  memoryEnabled: true,
  approvalRequired: false,
  status: "active",
  performanceScore: "80",
};

function agentToForm(agent: Agent): FormState {
  return {
    name: agent.name,
    role: agent.role,
    department: agent.department,
    description: agent.description,
    responsibilities: agent.responsibilities.join("\n"),
    skills: agent.skills.join("\n"),
    toolsAccess: agent.toolsAccess.join("\n"),
    objectives: agent.objectives.join("\n"),
    projectIds: agent.projectIds,
    reportingAgentId: agent.reportingAgentId ?? "",
    priorityLevel: agent.priorityLevel,
    memoryEnabled: agent.memoryEnabled,
    approvalRequired: agent.approvalRequired,
    status: agent.status,
    performanceScore: String(agent.performanceScore),
  };
}

function formToPayload(form: FormState) {
  const lines = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    name: form.name,
    role: form.role,
    department: form.department,
    description: form.description,
    responsibilities: lines(form.responsibilities),
    skills: lines(form.skills),
    toolsAccess: lines(form.toolsAccess),
    objectives: lines(form.objectives),
    projectIds: form.projectIds,
    reportingAgentId: form.reportingAgentId || null,
    priorityLevel: form.priorityLevel,
    memoryEnabled: form.memoryEnabled,
    approvalRequired: form.approvalRequired,
    status: form.status,
    performanceScore: Number(form.performanceScore),
  };
}

export function AgentsView({
  initialAgents,
  projects,
  isAdmin,
  founderName = "Founder",
  supabaseConfigured,
}: Props) {
  const router = useRouter();
  const [agents, setAgents] = useState(initialAgents);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [memoryAgentId, setMemoryAgentId] = useState<string | null>(null);
  const [memory, setMemory] = useState<AgentMemory[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setError("");
  }

  function openEdit(agent: Agent) {
    setEditingId(agent.id);
    setForm(agentToForm(agent));
    setFormOpen(true);
    setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = editingId ? `/api/sai/agents/${editingId}` : "/api/sai/agents";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save agent");
        return;
      }
      if (editingId) {
        setAgents((prev) => prev.map((a) => (a.id === editingId ? data.agent : a)));
      } else {
        setAgents((prev) => [...prev, data.agent]);
      }
      setFormOpen(false);
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function agentAction(id: string, action: string) {
    setLoading(true);
    const res = await fetch(`/api/sai/agents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (res.ok) {
      setAgents((prev) => prev.map((a) => (a.id === id ? data.agent : a)));
      router.refresh();
    }
    setLoading(false);
  }

  async function handleClone(id: string) {
    setLoading(true);
    const res = await fetch(`/api/sai/agents/${id}/clone`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setAgents((prev) => [...prev, data.agent]);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this agent permanently?")) return;
    const res = await fetch(`/api/sai/agents/${id}`, { method: "DELETE" });
    if (res.ok) {
      setAgents((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    }
  }

  async function viewMemory(agentId: string) {
    setMemoryAgentId(agentId);
    const res = await fetch(`/api/sai/agents/${agentId}/memory`);
    const data = await res.json();
    setMemory(data.memory ?? []);
  }

  function toggleProject(projectId: string) {
    setForm((prev) => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter((id) => id !== projectId)
        : [...prev.projectIds, projectId],
    }));
  }

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40";

  return (
    <div className="space-y-4">
      {isAdmin && supabaseConfigured && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/45">Agent Factory — create custom digital employees</p>
          <button type="button" onClick={openCreate} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white">
            + Create Agent
          </button>
        </div>
      )}

      <AgentHierarchy agents={agents} founderName={founderName} />

      {formOpen && (
        <form onSubmit={handleSubmit} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit Agent" : "Create Agent"}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Agent Name</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Agent Role</span>
              <input required value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Department</span>
              <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Priority Level</span>
              <select value={form.priorityLevel} onChange={(e) => setForm({ ...form, priorityLevel: e.target.value as PriorityLevel })} className={`${inputClass} bg-[#0d0d14]`}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-xs text-white/50">Description</span>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Responsibilities (one per line)</span>
              <textarea rows={4} value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Skills (one per line)</span>
              <textarea rows={4} value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Tools Access (one per line)</span>
              <textarea rows={3} value={form.toolsAccess} onChange={(e) => setForm({ ...form, toolsAccess: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Objectives (one per line)</span>
              <textarea rows={3} value={form.objectives} onChange={(e) => setForm({ ...form, objectives: e.target.value })} className={inputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Reporting Agent</span>
              <select value={form.reportingAgentId} onChange={(e) => setForm({ ...form, reportingAgentId: e.target.value })} className={`${inputClass} bg-[#0d0d14]`}>
                <option value="">None (Reports to Owner)</option>
                {agents.filter((a) => a.id !== editingId).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Status</span>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as AgentStatus })} className={`${inputClass} bg-[#0d0d14]`}>
                <option value="active">Active</option>
                <option value="busy">Busy</option>
                <option value="idle">Idle</option>
                <option value="disabled">Disabled</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Performance Score</span>
              <input type="number" min={0} max={100} value={form.performanceScore} onChange={(e) => setForm({ ...form, performanceScore: e.target.value })} className={inputClass} />
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={form.memoryEnabled} onChange={(e) => setForm({ ...form, memoryEnabled: e.target.checked })} />
                Memory Enabled
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input type="checkbox" checked={form.approvalRequired} onChange={(e) => setForm({ ...form, approvalRequired: e.target.checked })} />
                Approval Required
              </label>
            </div>
            {projects.length > 0 && (
              <div className="sm:col-span-2">
                <span className="mb-2 block text-xs text-white/50">Projects Assigned</span>
                <div className="flex flex-wrap gap-2">
                  {projects.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleProject(p.id)}
                      className={`rounded-lg border px-3 py-1 text-xs ${form.projectIds.includes(p.id) ? "border-purple-400/40 bg-purple-500/20 text-white" : "border-white/10 text-white/50"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">Save Agent</button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">Cancel</button>
          </div>
        </form>
      )}

      {memoryAgentId && (
        <div className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Agent Memory</h2>
            <button type="button" onClick={() => setMemoryAgentId(null)} className="text-xs text-white/50">Close</button>
          </div>
          <ul className="mt-3 space-y-2">
            {memory.length === 0 ? (
              <li className="text-sm text-white/40">No memory records yet.</li>
            ) : (
              memory.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="text-xs font-medium uppercase text-purple-300/70">{m.memoryType}</p>
                  <p className="text-sm text-white">{m.title}</p>
                  <p className="mt-1 text-xs text-white/50">{m.summary}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className={`enterprise-glass rounded-xl border p-5 ${agent.status === "disabled" ? "border-red-400/20 opacity-60" : "border-white/10"}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{agent.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusDot[agent.status]}`} />
                <span className="text-xs font-bold text-purple-300">
                  {agent.metrics?.overallScore ?? agent.performanceScore}
                </span>
              </div>
            </div>
            <p className="mt-1 text-xs text-purple-300/70">{agent.role} · {agent.department}</p>
            <p className="mt-1 text-[10px] text-white/35">Reports to: {getReportingLabel(agent)}</p>
            {agent.description && <p className="mt-2 text-xs text-white/45 line-clamp-2">{agent.description}</p>}
            <ul className="mt-3 space-y-1">
              {agent.responsibilities.slice(0, 3).map((r) => (
                <li key={r} className="text-xs text-white/50">· {r}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-white/35">
              <span>{agent.assignedProjects} projects</span>
              <span>{agent.activeTaskCount ?? 0} active tasks</span>
              {agent.capacityStatus && (
                <span className={capacityDot[agent.capacityStatus] ?? "text-white/35"}>
                  {agent.capacityStatus}
                </span>
              )}
              {agent.memoryEnabled && <span>memory on</span>}
              {agent.approvalRequired && <span>approval req.</span>}
            </div>
            <Link
              href={`/sai/agents/${agent.id}/workspace`}
              className="mt-3 inline-block text-[10px] font-medium text-purple-300 hover:text-purple-200"
            >
              Open Workspace →
            </Link>
            {isAdmin && supabaseConfigured && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => openEdit(agent)} className="text-[10px] text-white/50 hover:text-white">Edit</button>
                <button type="button" onClick={() => handleClone(agent.id)} className="text-[10px] text-white/50 hover:text-white">Clone</button>
                <button type="button" onClick={() => viewMemory(agent.id)} className="text-[10px] text-white/50 hover:text-white">Memory</button>
                {agent.status === "disabled" ? (
                  <button type="button" onClick={() => agentAction(agent.id, "enable")} className="text-[10px] text-emerald-300">Enable</button>
                ) : (
                  <>
                    <button type="button" onClick={() => agentAction(agent.id, "pause")} className="text-[10px] text-amber-300">Pause</button>
                    <button type="button" onClick={() => agentAction(agent.id, "disable")} className="text-[10px] text-red-300">Disable</button>
                  </>
                )}
                <button type="button" onClick={() => handleDelete(agent.id)} className="text-[10px] text-red-300">Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
