import { SectionPage } from "@/components/sai/section-page";
import { TasksView } from "@/components/sai/tasks-view";
import { getSession } from "@/lib/sai/api-auth";
import { getAgents } from "@/lib/sai/agents";
import { getEmployees } from "@/lib/sai/employees";
import { getTasks } from "@/lib/sai/tasks";
import type { Agent, Employee, Task } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function TasksPage() {
  const session = await getSession();
  const supabaseConfigured = isSupabaseConfigured();
  let tasks: Task[] = [];
  let agents: Agent[] = [];
  let employees: Employee[] = [];

  if (supabaseConfigured) {
    try {
      [tasks, agents, employees] = await Promise.all([
        getTasks(),
        getAgents(),
        getEmployees(),
      ]);
    } catch {
      tasks = [];
      agents = [];
      employees = [];
    }
  }

  return (
    <SectionPage
      title="Tasks"
      subtitle="Work lifecycle"
      description="Every task flows through the complete lifecycle from backlog to knowledge archival. Reassign work, approve releases, and track evidence."
    >
      <TasksView
        initialTasks={tasks}
        agents={agents}
        employees={employees}
        isAdmin={session?.role === "owner"}
        supabaseConfigured={supabaseConfigured}
      />
    </SectionPage>
  );
}
