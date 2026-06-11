"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalMode, ApprovalPolicy, GovernanceProfile, WorkflowMode } from "@/lib/sai/types";

type ProjectGovernance = {
  id: string;
  name: string;
  governance_profile: GovernanceProfile;
  workflow_mode: WorkflowMode;
};

type Props = {
  policies: ApprovalPolicy[];
  projects: ProjectGovernance[];
  stats: {
    governanceHealth: number;
    pendingApprovals: number;
    escalationsToday: number;
  };
  isAdmin: boolean;
};

export function GovernanceView({ policies, projects, stats, isAdmin }: Props) {
  const router = useRouter();
  const [policyList, setPolicyList] = useState(policies);
  const [projectList, setProjectList] = useState(projects);
  const [loading, setLoading] = useState(false);

  async function updatePolicy(id: string, mode: ApprovalMode) {
    setLoading(true);
    const res = await fetch("/api/sai/governance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId: id, mode }),
    });
    const data = await res.json();
    if (res.ok) {
      setPolicyList((prev) => prev.map((p) => (p.id === id ? data.policy : p)));
      router.refresh();
    }
    setLoading(false);
  }

  async function updateProject(id: string, governanceProfile: GovernanceProfile, workflowMode: WorkflowMode) {
    setLoading(true);
    const res = await fetch("/api/sai/governance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: id, governanceProfile, workflowMode }),
    });
    const data = await res.json();
    if (res.ok) {
      setProjectList((prev) => prev.map((p) => (p.id === id ? data.project : p)));
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "Governance Health", value: stats.governanceHealth },
          { label: "Pending Approvals", value: stats.pendingApprovals },
          { label: "Escalations Today", value: stats.escalationsToday },
        ].map((s) => (
          <article key={s.label} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50">{s.label}</p>
          </article>
        ))}
      </div>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Approval Policies</h2>
        <div className="mt-3 space-y-2">
          {policyList.map((policy) => (
            <div key={policy.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <div>
                <p className="text-sm text-white/85">{policy.name}</p>
                <p className="text-[10px] text-white/40">{policy.approvalType} · approver: {policy.approverRole}</p>
              </div>
              {isAdmin ? (
                <select
                  value={policy.mode}
                  disabled={loading}
                  onChange={(e) => updatePolicy(policy.id, e.target.value as ApprovalMode)}
                  className="rounded border border-white/10 bg-[#0d0d14] px-2 py-1 text-xs text-white"
                >
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                  <option value="conditional">Conditional</option>
                  <option value="escalated">Escalated</option>
                </select>
              ) : (
                <span className="text-xs text-purple-300/70">{policy.mode}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Project Governance Profiles</h2>
        <div className="mt-3 space-y-2">
          {projectList.map((project) => (
            <div key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
              <p className="text-sm text-white/85">{project.name}</p>
              {isAdmin ? (
                <div className="flex gap-2">
                  <select
                    value={project.governance_profile}
                    disabled={loading}
                    onChange={(e) => updateProject(project.id, e.target.value as GovernanceProfile, project.workflow_mode)}
                    className="rounded border border-white/10 bg-[#0d0d14] px-2 py-1 text-xs text-white"
                  >
                    <option value="strict">Strict</option>
                    <option value="standard">Standard</option>
                    <option value="autonomous">Autonomous</option>
                  </select>
                  <select
                    value={project.workflow_mode}
                    disabled={loading}
                    onChange={(e) => updateProject(project.id, project.governance_profile, e.target.value as WorkflowMode)}
                    className="rounded border border-white/10 bg-[#0d0d14] px-2 py-1 text-xs text-white"
                  >
                    <option value="manual">Manual</option>
                    <option value="semi_autonomous">Semi-Autonomous</option>
                    <option value="autonomous">Autonomous</option>
                  </select>
                </div>
              ) : (
                <span className="text-xs text-white/40">{project.governance_profile} · {project.workflow_mode}</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
