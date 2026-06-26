"use client";

import type { AutomationTool } from "@/lib/sai/agent-automations";
import type { ToolDefinition } from "@/lib/sai/tool-permissions";

type Props = {
  memoryEnabled: boolean;
  tools: AutomationTool[];
  registry: ToolDefinition[];
  onMemoryChange: (enabled: boolean) => void;
  onToolsChange: (tools: AutomationTool[]) => void;
};

export function AutomationToolsPanel({
  memoryEnabled,
  tools,
  registry,
  onMemoryChange,
  onToolsChange,
}: Props) {
  const internalKeys = new Set(
    tools.filter((t) => t.type === "internal").map((t) => t.key),
  );

  function toggleTool(key: string) {
    if (internalKeys.has(key)) {
      onToolsChange(tools.filter((t) => !(t.type === "internal" && t.key === key)));
    } else {
      onToolsChange([...tools, { type: "internal", key }]);
    }
  }

  function addMcpStub() {
    onToolsChange([...tools, { type: "mcp", serverName: "" }]);
  }

  function updateMcp(index: number, serverName: string) {
    const mcpTools = tools.filter((t) => t.type === "mcp");
    const others = tools.filter((t) => t.type !== "mcp");
    mcpTools[index] = { type: "mcp", serverName };
    onToolsChange([...others, ...mcpTools]);
  }

  function removeMcp(index: number) {
    const mcpTools = tools.filter((t) => t.type === "mcp");
    const others = tools.filter((t) => t.type !== "mcp");
    mcpTools.splice(index, 1);
    onToolsChange([...others, ...mcpTools]);
  }

  const mcpTools = tools.filter((t): t is Extract<AutomationTool, { type: "mcp" }> => t.type === "mcp");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
        <div>
          <p className="text-xs font-medium text-white">Memories</p>
          <p className="text-[10px] text-white/45">Persist context across automation runs</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={memoryEnabled}
            onChange={(e) => onMemoryChange(e.target.checked)}
            className="rounded"
          />
          Enabled
        </label>
      </div>

      {tools
        .filter((t) => t.type === "internal")
        .map((t) => {
          if (t.type !== "internal") return null;
          const def = registry.find((r) => r.toolKey === t.key);
          return (
            <div
              key={t.key}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2"
            >
              <div>
                <p className="text-xs font-medium text-white">{def?.label ?? t.key}</p>
                <p className="text-[10px] text-white/45">{def?.description ?? "Internal tool"}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleTool(t.key)}
                className="text-[10px] text-red-300/80 hover:underline"
              >
                Remove
              </button>
            </div>
          );
        })}

      {mcpTools.map((mcp, i) => (
        <div
          key={`mcp-${i}`}
          className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-white">MCP Server</p>
            <button
              type="button"
              onClick={() => removeMcp(i)}
              className="text-[10px] text-red-300/80 hover:underline"
            >
              Remove
            </button>
          </div>
          <input
            type="text"
            value={mcp.serverName}
            onChange={(e) => updateMcp(i, e.target.value)}
            placeholder="Server name (set up in Settings → MCP)"
            className="mt-2 w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white"
          />
          {!mcp.serverName && (
            <p className="mt-1 text-[10px] text-amber-300/70">Set up MCP in Settings before saving</p>
          )}
        </div>
      ))}

      <details className="group">
        <summary className="cursor-pointer list-none rounded-lg border border-dashed border-white/15 px-3 py-2 text-xs text-white/60 hover:bg-white/5">
          + Add Tool or MCP
        </summary>
        <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-[#12121a] p-2">
          {registry
            .filter((r) => !internalKeys.has(r.toolKey))
            .slice(0, 12)
            .map((r) => (
              <button
                key={r.toolKey}
                type="button"
                onClick={() => toggleTool(r.toolKey)}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/5"
              >
                {r.label}
              </button>
            ))}
          <button
            type="button"
            onClick={addMcpStub}
            className="block w-full rounded px-2 py-1.5 text-left text-xs text-purple-300 hover:bg-white/5"
          >
            MCP Server…
          </button>
        </div>
      </details>
    </div>
  );
}
