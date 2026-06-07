import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireOwner, requireSession } from "@/lib/sai/api-auth";
import { getCompanyId } from "@/lib/sai/company";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/sai/activity";

export async function GET() {
  const { error } = await requireSession();
  if (error) return error;

  const companyId = await getCompanyId();
  const employees = await prisma.user.findMany({
    where: { companyId, role: "employee" },
    include: { department: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(employees);
}

export async function POST(request: Request) {
  const { session, error } = await requireOwner();
  if (error) return error;

  const body = await request.json();
  const { name, username, password, title, departmentId, skills } = body as {
    name?: string;
    username?: string;
    password?: string;
    title?: string;
    departmentId?: string;
    skills?: string[];
  };

  if (!name?.trim() || !username?.trim() || !password?.trim()) {
    return NextResponse.json(
      { error: "Name, username, and password are required" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { username: username.trim() } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const companyId = await getCompanyId();
  const employee = await prisma.user.create({
    data: {
      name: name.trim(),
      username: username.trim(),
      passwordHash: await bcrypt.hash(password, 10),
      role: "employee",
      title: title?.trim() ?? "Employee",
      departmentId,
      skills: JSON.stringify(skills ?? []),
      status: "offline",
      companyId,
    },
    include: { department: true },
  });

  await logActivity({
    type: "employee_created",
    title: `Employee added: ${employee.name}`,
    companyId,
    userId: session!.id,
  });

  return NextResponse.json(
    { id: employee.id, name: employee.name, username: employee.username, title: employee.title },
    { status: 201 },
  );
}
