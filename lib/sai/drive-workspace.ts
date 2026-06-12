import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { upsertProjectResource } from "./project-resources";

export type DriveFolderType =
  | "root"
  | "requirements"
  | "architecture"
  | "sessions"
  | "releases"
  | "meetings"
  | "executive_reviews"
  | "knowledge";

const FOLDER_TYPES: DriveFolderType[] = [
  "root",
  "requirements",
  "architecture",
  "sessions",
  "releases",
  "meetings",
  "executive_reviews",
  "knowledge",
];

export type ProjectDriveFolder = {
  id: string;
  projectId: string;
  folderType: DriveFolderType;
  driveFolderId: string;
  driveFolderPath: string;
  createdAt: string;
};

type FolderRow = {
  id: string;
  project_id: string;
  folder_type: string;
  drive_folder_id: string;
  drive_folder_path: string;
  created_at: string;
};

function mapFolder(row: FolderRow): ProjectDriveFolder {
  return {
    id: row.id,
    projectId: row.project_id,
    folderType: row.folder_type as DriveFolderType,
    driveFolderId: row.drive_folder_id,
    driveFolderPath: row.drive_folder_path,
    createdAt: row.created_at,
  };
}

function folderPath(projectName: string, folderType: DriveFolderType): string {
  const base = `InnovateAegis/Projects/${projectName}`;
  if (folderType === "root") return base;
  const label = folderType.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return `${base}/${label}`;
}

/**
 * Provision Drive workspace folder structure in the database.
 * When Google Drive OAuth is connected, folder IDs can be updated via API later.
 */
export async function provisionProjectDriveWorkspace(
  projectId: string,
  projectName: string,
): Promise<ProjectDriveFolder[]> {
  const supabase = createSupabaseAdmin();
  const folders: ProjectDriveFolder[] = [];

  for (const folderType of FOLDER_TYPES) {
    const path = folderPath(projectName, folderType);
    const placeholderId = `pending:${projectId}:${folderType}`;

    const { data, error } = await supabase
      .from("project_drive_folders")
      .upsert(
        {
          project_id: projectId,
          folder_type: folderType,
          drive_folder_id: placeholderId,
          drive_folder_path: path,
        },
        { onConflict: "project_id,folder_type" },
      )
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    folders.push(mapFolder(data as FolderRow));
  }

  const root = folders.find((f) => f.folderType === "root");
  if (root) {
    await upsertProjectResource({
      projectId,
      resourceType: "drive_workspace",
      resourceName: `${projectName} Workspace`,
      resourceIdentifier: root.driveFolderPath,
      status: "active",
      metadata: { folderId: root.driveFolderId, provisioned: true },
    });
  }

  return folders;
}

export async function getProjectDriveFolders(projectId: string): Promise<ProjectDriveFolder[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_drive_folders")
    .select("*")
    .eq("project_id", projectId)
    .order("folder_type");

  if (error) throw new Error(error.message);
  return (data as FolderRow[]).map(mapFolder);
}

export function folderTypeForStepKey(stepKey: string): DriveFolderType {
  if (stepKey === "requirements") return "requirements";
  if (stepKey === "design") return "architecture";
  if (stepKey === "deployment" || stepKey === "validation") return "releases";
  if (stepKey.includes("executive") || stepKey.includes("ceo") || stepKey.includes("coo")) {
    return "executive_reviews";
  }
  if (stepKey === "documentation" || stepKey === "knowledge") return "knowledge";
  return "sessions";
}
