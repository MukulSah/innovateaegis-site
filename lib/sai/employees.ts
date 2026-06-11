import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { recordActivity } from "./activity-logs";
import type { Employee } from "./types";

type EmployeeRow = {
  id: string;
  name: string;
  role: string;
  department: string;
  status: Employee["status"];
  current_work: string;
};

export type EmployeeInput = {
  name: string;
  role: string;
  department: string;
  status: Employee["status"];
  currentWork: string;
};

function mapRow(row: EmployeeRow): Employee {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    department: row.department,
    status: row.status,
    currentWork: row.current_work,
  };
}

function mapInput(input: EmployeeInput) {
  return {
    name: input.name.trim(),
    role: input.role.trim(),
    department: input.department.trim(),
    status: input.status,
    current_work: input.currentWork.trim(),
  };
}

export async function getEmployees(): Promise<Employee[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as EmployeeRow[]).map(mapRow);
}

export async function createEmployee(input: EmployeeInput): Promise<Employee> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .insert(mapInput(input))
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const employee = mapRow(data as EmployeeRow);

  await recordActivity({
    actor: "SAI",
    action: `Employee added: ${employee.name}`,
    entityType: "employee",
    entityId: employee.id,
  });

  return employee;
}

export async function updateEmployee(
  id: string,
  input: EmployeeInput,
): Promise<Employee> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("employees")
    .update(mapInput(input))
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapRow(data as EmployeeRow);
}

export async function deleteEmployee(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("employees").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function validateEmployeeInput(body: unknown): EmployeeInput | null {
  if (!body || typeof body !== "object") return null;

  const data = body as Record<string, unknown>;
  const statuses: Employee["status"][] = ["online", "offline", "busy"];
  const name = typeof data.name === "string" ? data.name.trim() : "";
  const status = data.status as Employee["status"];

  if (!name || !statuses.includes(status)) return null;

  return {
    name,
    role: typeof data.role === "string" ? data.role : "",
    department: typeof data.department === "string" ? data.department : "",
    status,
    currentWork: typeof data.currentWork === "string" ? data.currentWork : "",
  };
}
