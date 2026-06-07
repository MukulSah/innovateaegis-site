import { SectionPage } from "@/components/sai/section-page";
import { getReleases } from "@/lib/sai/queries";

export default async function ReleasesPage() {
  const releases = await getReleases();

  return (
    <SectionPage
      title="Releases"
      subtitle="Deployment & delivery"
      description="The DevOps Agent handles infrastructure, CI/CD, monitoring, releases, and rollbacks. Every release is tracked and knowledge is archived."
    >
      <div className="space-y-3">
        {releases.map((release) => (
          <article
            key={release.id}
            className="enterprise-glass flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-5"
          >
            <div>
              <h3 className="text-sm font-semibold text-white">{release.version}</h3>
              <p className="mt-1 text-xs text-white/50">{release.notes}</p>
              {release.project && (
                <p className="mt-1 text-[10px] text-white/35">{release.project.name}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/40">
                {release.releaseDate?.toISOString().slice(0, 10) ?? "TBD"}
              </span>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${
                release.status === "released"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                  : "border-amber-400/20 bg-amber-500/10 text-amber-300"
              }`}>
                {release.status}
              </span>
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
