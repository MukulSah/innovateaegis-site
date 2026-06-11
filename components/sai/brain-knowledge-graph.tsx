"use client";

import { useMemo } from "react";
import type { KnowledgeGraph } from "@/lib/sai/brain/types";

type Props = {
  graph: KnowledgeGraph;
  onSelectNode?: (id: string) => void;
};

const DOMAIN_COLORS: Record<string, string> = {
  company: "#a78bfa",
  product: "#67e8f9",
  engineering: "#34d399",
  customer: "#f472b6",
  market: "#fbbf24",
  decision: "#fb923c",
  learning: "#818cf8",
  "ai-agent": "#c084fc",
  founder: "#e879f9",
};

export function BrainKnowledgeGraph({ graph, onSelectNode }: Props) {
  const layout = useMemo(() => {
    const width = 560;
    const height = 360;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = 120;

    const nodes = graph.nodes;
    const center = nodes.find((n) => n.id === graph.centerId);
    const others = nodes.filter((n) => n.id !== graph.centerId);

    const positions = new Map<string, { x: number; y: number }>();
    if (center) positions.set(center.id, { x: centerX, y: centerY });

    others.forEach((node, i) => {
      const angle = (i / Math.max(others.length, 1)) * Math.PI * 2 - Math.PI / 2;
      const r = radius + (node.level > 1 ? 40 : 0);
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * r,
        y: centerY + Math.sin(angle) * r,
      });
    });

    return { width, height, positions };
  }, [graph]);

  if (!graph.nodes.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-white/[0.02] text-sm text-white/40">
        No relationships yet. Link records to build the knowledge graph.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-purple-400/15 bg-[#08081a]/60 p-4">
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} className="w-full">
        {graph.edges.map((edge) => {
          const from = layout.positions.get(edge.sourceId);
          const to = layout.positions.get(edge.targetId);
          if (!from || !to) return null;
          return (
            <g key={edge.id}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="rgba(167,139,250,0.35)"
                strokeWidth={1.5}
              />
              {edge.label && (
                <text
                  x={(from.x + to.x) / 2}
                  y={(from.y + to.y) / 2}
                  fill="rgba(255,255,255,0.35)"
                  fontSize={9}
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}
        {graph.nodes.map((node) => {
          const pos = layout.positions.get(node.id);
          if (!pos) return null;
          const color = DOMAIN_COLORS[node.domainSlug] ?? "#a78bfa";
          const isCenter = node.id === graph.centerId;
          return (
            <g
              key={node.id}
              className="cursor-pointer"
              onClick={() => onSelectNode?.(node.id)}
            >
              <circle
                cx={pos.x}
                cy={pos.y}
                r={isCenter ? 22 : 16}
                fill={`${color}33`}
                stroke={color}
                strokeWidth={isCenter ? 2.5 : 1.5}
              />
              <text
                x={pos.x}
                y={pos.y + (isCenter ? 36 : 30)}
                fill="rgba(255,255,255,0.75)"
                fontSize={10}
                textAnchor="middle"
              >
                {node.title.length > 18 ? `${node.title.slice(0, 16)}…` : node.title}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-[10px] uppercase tracking-wider text-white/35">
        {graph.nodes.length} nodes · {graph.edges.length} connections
      </p>
    </div>
  );
}
