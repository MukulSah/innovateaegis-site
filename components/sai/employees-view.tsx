"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { Employee } from "@/lib/sai/types";

const statusDot: Record<Employee["status"], string> = {
  online: "bg-emerald-400",
  busy: "bg-amber-400",
  offline: "bg-white/20",
};

type Props = {
  initialEmployees: Employee[];
  isAdmin: boolean;
  supabaseConfigured: boolean;
};

type FormState = {
  name: string;
  role: string;
  department: string;
  status: Employee["status"];
  currentWork: string;
};

const emptyForm: FormState = {
  name: "",
  role: "",
  department: "",
  status: "offline",
  currentWork: "",
};

export function EmployeesView({ initialEmployees, isAdmin, supabaseConfigured }: Props) {
  const router = useRouter();
  const [employees, setEmployees] = useState(initialEmployees);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setFormOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditingId(employee.id);
    setForm({
      name: employee.name,
      role: employee.role,
      department: employee.department,
      status: employee.status,
      currentWork: employee.currentWork,
    });
    setError("");
    setFormOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const url = editingId ? `/api/sai/employees/${editingId}` : "/api/sai/employees";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }
      if (editingId) {
        setEmployees((prev) => prev.map((e) => (e.id === editingId ? data.employee : e)));
      } else {
        setEmployees((prev) => [...prev, data.employee]);
      }
      setFormOpen(false);
      router.refresh();
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this employee?")) return;
    setLoading(true);
    const res = await fetch(`/api/sai/employees/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {isAdmin && supabaseConfigured && (
        <div className="flex justify-end">
          <button type="button" onClick={openCreate} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white">
            + New Employee
          </button>
        </div>
      )}

      {formOpen && (
        <form onSubmit={handleSubmit} className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit Employee" : "Create Employee"}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(["name", "role", "department", "currentWork"] as const).map((field) => (
              <label key={field} className="block">
                <span className="mb-1 block text-xs capitalize text-white/50">{field === "currentWork" ? "Current Work" : field}</span>
                <input
                  required={field === "name"}
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-purple-400/40"
                />
              </label>
            ))}
            <label className="block">
              <span className="mb-1 block text-xs text-white/50">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Employee["status"] })}
                className="w-full rounded-lg border border-white/10 bg-[#0d0d14] px-3 py-2 text-sm text-white"
              >
                <option value="online">Online</option>
                <option value="busy">Busy</option>
                <option value="offline">Offline</option>
              </select>
            </label>
          </div>
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">Save</button>
            <button type="button" onClick={() => setFormOpen(false)} className="rounded-lg border border-white/10 px-4 py-2 text-xs text-white/70">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {employees.map((employee) => (
          <article key={employee.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-600/40 to-cyan-500/40 text-sm font-bold text-white">
                {employee.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-white">{employee.name}</h3>
                <p className="text-xs text-white/50">{employee.role}</p>
              </div>
              <span className={`h-2 w-2 shrink-0 rounded-full ${statusDot[employee.status]}`} />
            </div>
            <div className="mt-4 space-y-1 text-xs text-white/45">
              <p>Department: <span className="text-white/70">{employee.department}</span></p>
              <p>Current work: <span className="text-white/70">{employee.currentWork}</span></p>
            </div>
            {isAdmin && supabaseConfigured && (
              <div className="mt-3 flex gap-2">
                <button type="button" onClick={() => openEdit(employee)} className="text-[10px] text-white/50 hover:text-white">Edit</button>
                <button type="button" onClick={() => handleDelete(employee.id)} className="text-[10px] text-red-300 hover:text-red-200">Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
