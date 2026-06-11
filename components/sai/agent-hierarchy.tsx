"use client";

import type { Agent } from "@/lib/sai/types";
import { buildAgentHierarchy, type HierarchyNode } from "@/lib/sai/agent-hierarchy";

type Props = {
  agents: Agent[];
  founderName?: string;
};

function HierarchyBranch({
  node,
  depth = 0,
  isLast = true,
  prefix = "",
}: {
  node: HierarchyNode;
  depth?: number;
  isLast?: boolean;
  prefix?: string;
}) {
  const connector = depth === 0 ? "" : isLast ? "└── " : "├── ";
  const childPrefix = depth === 0 ? "" : isLast ? `${prefix}    ` : `${prefix}│   `;

  return (
    <>
      <div className="font-mono text-xs leading-6">
        <span className="text-white/25">{prefix}{connector}</span>
        <span className={node.isOwner ? "font-semibold text-cyan-300" : "text-white/85"}>
          {node.isOwner ? `Founder (${node.name})` : node.name}
        </span>
        {!node.isOwner && (
          <span className="ml-2 text-white/35">· {node.role}</span>
        )}
      </div>
      {node.children.map((child, index) => (
        <HierarchyBranch
          key={child.id}
          node={child}
          depth={depth + 1}
          isLast={index === node.children.length - 1}
          prefix={childPrefix}
        />
      ))}
    </>
  );
}

export function AgentHierarchy({ agents, founderName = "Founder" }: Props) {
  const tree = buildAgentHierarchy(agents, founderName);

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h2 className="text-sm font-semibold text-white">Organization Hierarchy</h2>
      <p className="mt-1 text-xs text-white/45">
        Agents with no reporting manager report directly to the founder ({founderName}).
      </p>
      <div className="mt-4 overflow-x-auto rounded-lg border border-white/5 bg-black/20 p-4">
        {agents.length === 0 ? (
          <p className="font-mono text-xs text-white/40">
            Founder ({founderName})
            <br />
            <span className="text-white/25">└── </span>
            <span className="text-white/35">No agents yet — create CEO Agent with Reporting Agent = None</span>
          </p>
        ) : (
          <HierarchyBranch node={tree} />
        )}
      </div>
    </section>
  );
}
