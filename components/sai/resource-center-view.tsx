"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProjectIntegration } from "@/lib/sai/connectors/project-integrations";
import type { ProjectResource } from "@/lib/sai/project-resources";
import type { Agent, IntegrationAccount, Project } from "@/lib/sai/types";

const RESOURCE_CATEGORIES = [
  { id: "repositories", label: "Repositories", description: "GitHub repos linked to projects" },
  { id: "drive", label: "Drive", description: "Google Drive folders" },
  { id: "databases", label: "Databases", description: "Database connections" },
  { id: "servers", label: "Servers", description: "Deployment targets" },
  { id: "domains", label: "Domains", description: "DNS and domain config" },
  { id: "integrations", label: "Integrations", description: "OAuth connected accounts" },
  { id: "models", label: "Models", description: "AI model configuration" },
  { id: "knowledge", label: "Knowledge Sources", description: "Brain, Notion, Confluence (future)" },
];

type Props = {
  agents: Agent[];
  accounts: IntegrationAccount[];
  projects: Project[];
  projectIntegrations: ProjectIntegration[];
  projectResources: ProjectResource[];
  oauthAvailable: { github: boolean; google_drive: boolean };
};

export function ResourceCenterView({
  agents,
  accounts,
  projects,
  projectIntegrations,
  projectResources,
  oauthAvailable,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [assignProjectId, setAssignProjectId] = useState(projects[0]?.id ?? "");
  const [assignAccountId, setAssignAccountId] = useState(accounts[0]?.id ?? "");
  const [repoPath, setRepoPath] = useState("");
  const [driveFolder, setDriveFolder] = useState("");

  async function connect(provider: "github" | "google_drive") {
    setLoading(provider);
    try {
      const res = await fetch("/api/sai/connectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (data.authorizeUrl) window.location.href = data.authorizeUrl;
    } finally {
      setLoading(null);
    }
  }

  async function disconnect(id: string) {
    await fetch(`/api/sai/connectors?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function assignToProject() {
    if (!assignProjectId || !assignAccountId) return;
    const account = accounts.find((a) => a.id === assignAccountId);
    const config =
      account?.provider === "github"
        ? { repo: repoPath.trim() }
        : account?.provider === "google_drive"
          ? { folder: driveFolder.trim() }
          : {};
    await fetch("/api/sai/connectors/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: assignProjectId,
        integrationAccountId: assignAccountId,
        config,
      }),
    });
    router.refresh();
  }

  const availableAgents = agents.filter((a) => a.status !== "disabled");

  return (
    <div className="space-y-6">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Resource Categories</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {RESOURCE_CATEGORIES.map((cat) => (
            <div key={cat.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white">{cat.label}</p>
              <p className="mt-1 text-xs text-white/45">{cat.description}</p>
              {cat.id === "integrations" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {oauthAvailable.github && (
                    <button
                      type="button"
                      disabled={loading === "github"}
                      onClick={() => connect("github")}
                      className="rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/15"
                    >
                      Add GitHub
                    </button>
                  )}
                  {oauthAvailable.google_drive && (
                    <button
                      type="button"
                      disabled={loading === "google_drive"}
                      onClick={() => connect("google_drive")}
                      className="rounded bg-white/10 px-2 py-1 text-[10px] text-white hover:bg-white/15"
                    >
                      Add Google Drive
                    </button>
                  )}
                </div>
              )}
              {cat.id === "models" && (
                <Link href="/sai/settings/ai" className="mt-2 inline-block text-[10px] text-purple-300">
                  Configure →
                </Link>
              )}
              {cat.id === "knowledge" && (
                <Link href="/sai/brain" className="mt-2 inline-block text-[10px] text-purple-300">
                  Company Brain →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-cyan-400/15 p-5">
        <h2 className="text-sm font-semibold text-white">Company Resource Registry</h2>
        <p className="mt-1 text-xs text-white/45">
          Project resource maps feed COO execution readiness and agent context.
        </p>
        {projectResources.length === 0 ? (
          <p className="mt-3 text-sm text-white/40">
            No resources registered yet. Create a project or assign integrations to populate the registry.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {projects.map((project) => {
              const resources = projectResources.filter((r) => r.projectId === project.id);
              if (resources.length === 0) return null;
              return (
                <li key={project.id} className="rounded-lg border border-white/5 p-3">
                  <p className="text-sm font-medium text-white">{project.name}</p>
                  <ul className="mt-2 space-y-1">
                    {resources.map((r) => (
                      <li key={r.id} className="text-xs text-white/60">
                        <span className="text-cyan-300/80">{r.resourceType}</span>: {r.resourceName}
                        {r.resourceIdentifier ? ` — ${r.resourceIdentifier}` : ""}
                        <span className="ml-2 text-white/35">[{r.status}]</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Assign Resource to Project</h2>
        <p className="mt-1 text-xs text-white/45">
          Connect GitHub repos or Drive folders to projects for agent context.
        </p>
        {accounts.length > 0 && projects.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <select
              value={assignProjectId}
              onChange={(e) => setAssignProjectId(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#0a0a1a]">
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={assignAccountId}
              onChange={(e) => setAssignAccountId(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id} className="bg-[#0a0a1a]">
                  {a.provider}: {a.accountLabel || a.accountIdentifier}
                </option>
              ))}
            </select>
            {accounts.find((a) => a.id === assignAccountId)?.provider === "github" && (
              <input
                value={repoPath}
                onChange={(e) => setRepoPath(e.target.value)}
                placeholder="org/repository"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2"
              />
            )}
            {accounts.find((a) => a.id === assignAccountId)?.provider === "google_drive" && (
              <input
                value={driveFolder}
                onChange={(e) => setDriveFolder(e.target.value)}
                placeholder="Drive folder ID or path"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white sm:col-span-2"
              />
            )}
            <button
              type="button"
              onClick={assignToProject}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white sm:col-span-2"
            >
              Assign to Project
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-white/40">Connect an account and create a project first.</p>
        )}
        {projectIntegrations.length > 0 && (
          <ul className="mt-4 space-y-2">
            {projectIntegrations.map((pi) => (
              <li key={pi.id} className="rounded border border-white/5 p-2 text-xs text-white/70">
                {pi.projectName ?? pi.projectId} ← {pi.provider} ({pi.accountLabel})
                {pi.config.repo ? ` · repo: ${String(pi.config.repo)}` : ""}
                {pi.config.folder ? ` · folder: ${String(pi.config.folder)}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Connected Accounts</h2>
        <ul className="mt-3 space-y-2">
          {accounts.length === 0 ? (
            <li className="text-sm text-white/40">No accounts connected yet.</li>
          ) : (
            accounts.map((acc) => (
              <li
                key={acc.id}
                className="flex items-center justify-between rounded-lg border border-white/5 p-3"
              >
                <div>
                  <p className="text-sm text-white">{acc.accountLabel || acc.accountIdentifier}</p>
                  <p className="text-xs text-white/40">
                    {acc.provider} · {acc.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => disconnect(acc.id)}
                  className="text-xs text-red-300 hover:underline"
                >
                  Disconnect
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">Agent Capacity</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {availableAgents.map((agent) => (
            <li key={agent.id} className="rounded-lg border border-white/5 p-3">
              <Link href={`/sai/organization/agents/${agent.id}/workspace`} className="text-sm text-white hover:underline">
                {agent.name}
              </Link>
              <p className="text-xs text-white/40">{agent.role}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
