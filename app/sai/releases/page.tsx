import { SectionPage } from "@/components/sai/section-page";

const releases = [
  { version: "Sentra v2.4.0", date: "2026-05-28", status: "Released", notes: "Agent auto-update, endpoint grouping" },
  { version: "FaceNova v1.8.2", date: "2026-05-20", status: "Released", notes: "Camera failover, attendance export" },
  { version: "HYGYR v3.1.0", date: "2026-05-15", status: "Released", notes: "Template engine refactor, new layouts" },
  { version: "Sentra v2.5.0", date: "2026-06-15", status: "Planned", notes: "Deployment module, rollback support" },
];

export default function ReleasesPage() {
  return (
    <SectionPage
      title="Releases"
      subtitle="Deployment & delivery"
      description="The DevOps Agent handles infrastructure, CI/CD, monitoring, releases, and rollbacks. Every release is tracked and knowledge is archived."
    >
      <div className="space-y-3">
        {releases.map((release) => (
          <article
            key={release.version}
            className="enterprise-glass flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/10 p-5"
          >
            <div>
              <h3 className="text-sm font-semibold text-white">{release.version}</h3>
              <p className="mt-1 text-xs text-white/50">{release.notes}</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-white/40">{release.date}</span>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase ${
                release.status === "Released"
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
