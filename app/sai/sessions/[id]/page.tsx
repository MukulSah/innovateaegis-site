import Link from "next/link";
import { notFound } from "next/navigation";
import { SessionWorkspaceView } from "@/components/sai/session-workspace-view";
import { getSessionTruth } from "@/lib/sai/session-truth-engine";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function SessionWorkspacePage({ params }: Props) {
  const { id } = await params;

  if (!isSupabaseConfigured()) notFound();

  const truth = await getSessionTruth(id);
  if (!truth) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
            Session Center · Mission Control
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white">
            Session #{truth.sessionNumber ?? "—"} — {truth.projectName}
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-white/55">{truth.objective}</p>
        </div>
        <Link
          href="/sai/sessions"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
        >
          ← Back to Session Center
        </Link>
      </header>

      <SessionWorkspaceView sessionId={id} />
    </div>
  );
}
