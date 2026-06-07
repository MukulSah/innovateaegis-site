type Props = {
  dataPoints: number;
  memories: number;
};

export function SAIBrainBanner({ dataPoints, memories }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-r from-purple-950/40 via-[#0a0a24] to-cyan-950/30 p-6 md:p-8">
      <div className="pointer-events-none absolute inset-0 sai-brain-pulse" />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/80">
            SAI Brain — Central Intelligence
          </p>
          <h2 className="mt-2 text-lg font-bold text-white md:text-xl">
            Are we moving closer to company goals?
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">
            Everything reports to SAI Brain — projects, tasks, products, employees, agents,
            customers, revenue, documentation, meetings, and decisions. The digital twin of your
            company is live.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{dataPoints}</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">Data Points</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-white">{memories}</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">Memories</p>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">Live</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-white/40">Status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
