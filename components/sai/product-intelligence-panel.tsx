type Product = {
  slug: string;
  name: string;
  healthScore: number;
  healthStatus: string;
  growthRate: string | null;
  revenue: number;
  openRisks: string[];
  releaseReadiness: number;
  aiRecommendations: string[];
  pipelineValue: number;
};

type Props = {
  products: Product[];
};

const statusDot: Record<string, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-400",
};

export function ProductIntelligencePanel({ products }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Product Intelligence
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">Per-Product Intelligence Centers</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <article
            key={product.slug}
            className="enterprise-glass rounded-xl border border-white/10 p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">{product.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${statusDot[product.healthStatus] ?? statusDot.yellow}`} />
                <span className="text-sm font-bold text-white">{product.healthScore}</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/45">
              <span>Revenue: <span className="text-white/70">${product.revenue.toLocaleString()}</span></span>
              <span>Growth: <span className="text-white/70">{product.growthRate ?? "N/A"}</span></span>
              <span>Release Ready: <span className="text-white/70">{product.releaseReadiness}%</span></span>
              <span>Pipeline: <span className="text-white/70">${product.pipelineValue.toLocaleString()}</span></span>
            </div>

            {product.openRisks.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-red-300/70">Open Risks</p>
                <ul className="mt-1 space-y-0.5">
                  {product.openRisks.slice(0, 2).map((risk) => (
                    <li key={risk} className="text-[11px] text-white/50">· {risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {product.aiRecommendations.length > 0 && (
              <div className="mt-3 rounded-lg border border-purple-400/10 bg-purple-500/5 px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.1em] text-purple-300/70">AI Recommendation</p>
                <p className="mt-1 text-[11px] text-white/60">{product.aiRecommendations[0]}</p>
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
