import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { findAgentForRole, getAgents } from "./agents";
import { folderTypeForStepKey, getProjectDriveFolders } from "./drive-workspace";
import { addProjectMemory } from "./project-memory";
import type { SessionArtifact } from "./session-artifacts";

export type DriveDocumentRecord = {
  id: string;
  projectId: string;
  sessionId: string | null;
  artifactId: string | null;
  driveFileId: string;
  driveUrl: string;
  folderType: string;
  documentTitle: string;
  version: number;
  createdByAgentId: string | null;
  createdAt: string;
};

type DocRow = {
  id: string;
  project_id: string;
  session_id: string | null;
  artifact_id: string | null;
  drive_file_id: string;
  drive_url: string;
  folder_type: string;
  document_title: string;
  version: number;
  created_by_agent: string | null;
  created_at: string;
};

function mapDoc(row: DocRow): DriveDocumentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    sessionId: row.session_id,
    artifactId: row.artifact_id,
    driveFileId: row.drive_file_id,
    driveUrl: row.drive_url,
    folderType: row.folder_type,
    documentTitle: row.document_title,
    version: row.version,
    createdByAgentId: row.created_by_agent,
    createdAt: row.created_at,
  };
}

/**
 * Documentation Agent pipeline: artifact → Drive document record → project memory.
 * Drive file creation uses placeholder URLs until Google Drive API upload is wired.
 */
export async function processArtifactDocumentation(input: {
  artifact: SessionArtifact;
  projectId: string;
  projectName?: string;
}): Promise<DriveDocumentRecord | null> {
  if (!input.artifact.workflowRunId) return null;

  const agents = await getAgents();
  const docAgent = findAgentForRole(agents, ["Documentation", "Knowledge"]);
  const folderType = folderTypeForStepKey(input.artifact.stepKey);
  const folders = await getProjectDriveFolders(input.projectId);
  const folder = folders.find((f) => f.folderType === folderType) ?? folders.find((f) => f.folderType === "sessions");
  const title = input.artifact.artifactName ?? `${input.artifact.stepKey}_v${input.artifact.turnNumber}`;
  const placeholderFileId = `doc:${input.artifact.id}`;
  const driveUrl = folder
    ? `https://drive.google.com/${folder.driveFolderPath}/${title}`
    : `https://drive.google.com/pending/${input.projectId}/${title}`;

  const supabase = createSupabaseAdmin();
  const { count } = await supabase
    .from("drive_documents")
    .select("*", { count: "exact", head: true })
    .eq("artifact_id", input.artifact.id);

  const version = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("drive_documents")
    .insert({
      project_id: input.projectId,
      session_id: input.artifact.workflowRunId,
      artifact_id: input.artifact.id,
      drive_file_id: placeholderFileId,
      drive_url: driveUrl,
      folder_type: folderType,
      document_title: title,
      version,
      created_by_agent: docAgent?.id ?? input.artifact.agentId,
    })
    .select("*")
    .single();

  if (error) {
    console.warn("[documentation-pipeline] insert failed:", error.message);
    return null;
  }

  const doc = mapDoc(data as DocRow);

  await addProjectMemory({
    projectId: input.projectId,
    memoryType: "knowledge",
    title: `Document: ${title}`,
    summary: `Archived to Drive (${folderType}). ${input.artifact.outputSummary.slice(0, 300)}`,
    sourceType: "drive_document",
    sourceId: doc.id,
  });

  if (docAgent) {
    await addProjectMemory({
      projectId: input.projectId,
      memoryType: "lesson",
      title: `Documentation indexed: ${title}`,
      summary: `${docAgent.name} archived artifact to ${folder?.driveFolderPath ?? "project workspace"}.`,
      sourceType: "documentation_agent",
      sourceId: input.artifact.id,
    });
  }

  return doc;
}

export async function getProjectDriveDocuments(projectId: string, limit = 50): Promise<DriveDocumentRecord[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("drive_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data as DocRow[]).map(mapDoc);
}
