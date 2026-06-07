type Props = {
  data: {
    mrr: number;
    arr: number;
    pipeline: number;
    forecast: number;
    growthRate: string;
    revenueByProduct: Array<{ name: string; slug: string; revenue: number }>;
    opportunities: Array<{
      id: string;
      title: string;
      value: number;
      stage: string;
      probability: number;
      product: { name: string } | null;
      customer: { name: string } | null;
    }>;
  };
};

export function RevenuePanel({ data }: Props) {
  return (
    <section className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Revenue Operating System
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">Business Performance</h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="MRR" value={`$${Math.round(data.mrr).toLocaleString()}`} />
        <MetricCard label="ARR" value={`$${Math.round(data.arr).toLocaleString()}`} />
        <MetricCard label="Pipeline" value={`$${Math.round(data.pipeline).toLocaleString()}`} />
        <MetricCard label="Forecast" value={`$${Math.round(data.forecast).toLocaleString()}`} sub={data.growthRate} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Revenue by Product</h3>
          <ul className="mt-3 space-y-2">
            {data.revenueByProduct.map((p) => (
              <li key={p.slug} className="flex justify-between text-sm">
                <span className="text-white/70">{p.name}</span>
                <span className="font-medium text-white">${p.revenue.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Pipeline Opportunities</h3>
          <ul className="mt-3 space-y-2">
            {data.opportunities.slice(0, 6).map((o) => (
              <li key={o.id} className="rounded-lg border border-white/5 px-3 py-2">
                <div className="flex justify-between">
                  <span className="text-sm text-white/80">{o.title}</span>
                  <span className="text-sm font-medium text-emerald-300">${o.value.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-white/35">
                  {o.stage} · {o.probability}% · {o.product?.name ?? "General"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="enterprise-glass rounded-xl border border-white/10 p-4 text-center">
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.1em] text-white/40">{label}</p>
      {sub && <p className="mt-0.5 text-[10px] text-emerald-400">{sub}</p>}
    </div>
  );
}
