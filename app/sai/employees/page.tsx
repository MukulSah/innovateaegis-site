import { EmployeesView } from "@/components/sai/employees-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getEmployees } from "@/lib/sai/employees";
import type { Employee } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function EmployeesPage() {
  const session = await getSession();
  const supabaseConfigured = isSupabaseConfigured();
  let employees: Employee[] = [];

  if (supabaseConfigured) {
    try {
      employees = await getEmployees();
    } catch {
      employees = [];
    }
  }

  return (
    <SectionPage
      title="Employees"
      subtitle="Human organization"
      description="Every employee has a profile with role, department, assigned work, activity history, performance metrics, and knowledge contributions."
    >
      <EmployeesView
        initialEmployees={employees}
        isAdmin={session?.role === "owner"}
        supabaseConfigured={supabaseConfigured}
      />
    </SectionPage>
  );
}
