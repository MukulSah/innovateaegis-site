import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivity } from "./activity-logs";
import { recordActivityFeed } from "./activity-feed";
import { notifyFounder, notifyTeam } from "./notifications";
import type { Release, ReleaseStatus } from "./types";

type ReleaseRow = {
  id: string;
  project_id: string;
  version: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  release_date: string | null;
  created_at: string;
  projects?: { name: string } | null;
};

export type ReleaseInput = {
  projectId: string;
  version: string;
  title: string;
  description: string;
  status: ReleaseStatus;
  releaseDate?: string | null;
};

const releaseSelect = `*, projects(name)`;

function mapRow(row: ReleaseRow): Release {
  return {
    id: row.id,
    projectId: row.project_id,
    projectName: row.projects?.name ?? null,
    version: row.version,
    title: row.title,
    description: row.description,
    status: row.status,
    releaseDate: row.release_date,
    createdAt: row.created_at,
  };
}

function mapInput(input: ReleaseInput) {
  const releaseDate =
    input.status === "released" && !input.releaseDate
      ? new Date().toISOString()
      : input.releaseDate ?? null;

  return {
    project_id: input.projectId,
    version: input.version.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    status: input.status,
    release_date: releaseDate,
  };
}

export async function getReleases(): Promise<Release[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("releases")
    .select(releaseSelect)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as ReleaseRow[]).map(mapRow);
}

export async function getReleaseById(id: string): Promise<Release | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("releases")
    .select(releaseSelect)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data as ReleaseRow) : null;
}

export async function countReleasedVersions(): Promise<number> {
  if (!isSupabaseConfigured()) return 0;

  const supabase = createSupabaseAdmin();
  const { count, error } = await supabase
    .from("releases")
    .select("*", { count: "exact", head: true })
    .eq("status", "released");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function createRelease(input: ReleaseInput, actor = "SAI"): Promise<Release> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("releases")
    .insert(mapInput(input))
    .select(releaseSelect)
    .single();

  if (error) throw new Error(error.message);
  const release = mapRow(data as ReleaseRow);

  await recordActivity({
    actor,
    action: `Release created: ${release.version}`,
    entityType: "release",
    entityId: release.id,
  });

  if (release.status === "released") {
    await recordActivity({
      actor,
      action: `Release published: ${release.version}`,
      entityType: "release",
      entityId: release.id,
    });
    await recordActivityFeed({
      actor,
      action: "release_published",
      targetType: "release",
      targetId: release.id,
      description: release.title,
    });
    await notifyFounder(
      `Release published: ${release.version}`,
      release.title,
      "RELEASE",
      { severity: "HIGH", entityType: "release", entityId: release.id },
    );
    await notifyTeam(
      `Release ${release.version} published`,
      release.description.slice(0, 200),
      "RELEASE",
      { entityType: "release", entityId: release.id },
    );
  }

  return release;
}

export async function updateRelease(
  id: string,
  input: ReleaseInput,
  actor = "SAI",
): Promise<Release> {
  const existing = await getReleaseById(id);
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("releases")
    .update(mapInput(input))
    .eq("id", id)
    .select(releaseSelect)
    .single();

  if (error) throw new Error(error.message);
  const release = mapRow(data as ReleaseRow);

  if (existing && existing.status !== "released" && release.status === "released") {
    await recordActivity({
      actor,
      action: `Release published: ${release.version}`,
      entityType: "release",
      entityId: release.id,
    });
    await recordActivityFeed({
      actor,
      action: "release_published",
      targetType: "release",
      targetId: release.id,
      description: release.title,
    });
    await notifyFounder(
      `Release published: ${release.version}`,
      release.title,
      "RELEASE",
      { severity: "HIGH", entityType: "release", entityId: release.id },
    );
    await notifyTeam(
      `Release ${release.version} published`,
      release.description.slice(0, 200),
      "RELEASE",
      { entityType: "release", entityId: release.id },
    );
  }

  return release;
}

export async function deleteRelease(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("releases").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function validateReleaseInput(body: unknown): ReleaseInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const statuses: ReleaseStatus[] = ["planned", "ready", "released", "rolled_back"];
  const projectId = typeof data.projectId === "string" ? data.projectId : "";
  const version = typeof data.version === "string" ? data.version.trim() : "";
  const title = typeof data.title === "string" ? data.title.trim() : "";
  const status = data.status as ReleaseStatus;

  if (!projectId || !version || !title || !statuses.includes(status)) return null;

  return {
    projectId,
    version,
    title,
    description: typeof data.description === "string" ? data.description : "",
    status,
    releaseDate: typeof data.releaseDate === "string" ? data.releaseDate : null,
  };
}
