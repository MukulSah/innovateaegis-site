import { CreateReleaseForm } from "@/components/sai/create-release-form";
import { SectionPage } from "@/components/sai/section-page";
import { prisma } from "@/lib/prisma";
import { getCompanyId } from "@/lib/sai/company";
import { getReleases } from "@/lib/sai/queries";

export default async function ReleasesPage() {
  const companyId = await getCompanyId();
  const [releases, projects] = await Promise.all([
    getReleases(),
    prisma.project.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <SectionPage
      title="Releases"
      subtitle="Deployment & delivery"
      description="Track planned and shipped releases across all projects."
    >
      <CreateReleaseForm projects={projects} />

      <div className="mt-6 space-y-3">
        {releases.length === 0 ? (
          <p className="text-sm text-white/40">No releases scheduled yet.</p>
        ) : (
          releases.map((release) => (
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
          ))
        )}
      </div>
    </SectionPage>
  );
}
