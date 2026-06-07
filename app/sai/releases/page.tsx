import { SectionPage } from "@/components/sai/section-page";
import { getOrganizationalLearnings } from "@/lib/sai/learning";
import { getReleases } from "@/lib/sai/queries";

export default async function ReleasesPage() {
  const [releases, learnings] = await Promise.all([
    getReleases(),
    getOrganizationalLearnings(10),
  ]);

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

      <div className="mt-10 space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
            Organizational Learning Engine
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">The company learns from every release</h2>
          <p className="mt-1 text-xs text-white/45">
            What worked, what failed, delays, bugs, customer reactions, and engineering lessons — archived for future projects.
          </p>
        </div>

        {learnings.map((learning) => (
          <article key={learning.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">{learning.title}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {learning.whatWorked && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-emerald-300/70">What Worked</p>
                  <p className="mt-1 text-xs text-white/55">{learning.whatWorked}</p>
                </div>
              )}
              {learning.whatFailed && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-red-300/70">What Failed</p>
                  <p className="mt-1 text-xs text-white/55">{learning.whatFailed}</p>
                </div>
              )}
              {learning.engineeringLessons && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-cyan-300/70">Engineering Lessons</p>
                  <p className="mt-1 text-xs text-white/55">{learning.engineeringLessons}</p>
                </div>
              )}
              {learning.businessOutcome && (
                <div>
                  <p className="text-[10px] uppercase tracking-[0.1em] text-purple-300/70">Business Outcome</p>
                  <p className="mt-1 text-xs text-white/55">{learning.businessOutcome}</p>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
