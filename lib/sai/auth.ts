import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const SAI_AUTH_COOKIE = "sai_auth";
export const SAI_USER_COOKIE = "sai_user";

export const DEFAULT_CREDENTIALS = {
  username: "admin",
  password: "admin",
} as const;

export interface AuthSession {
  id: string;
  username: string;
  name: string;
  role: "owner" | "employee";
  title: string;
  department: string;
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<AuthSession | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: { department: true },
  });

  if (!user || !["owner", "employee"].includes(user.role)) {
    return null;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role as "owner" | "employee",
    title: user.title ?? "Team Member",
    department: user.department?.name ?? "General",
  };
}

export function sessionFromCookie(value: string | undefined): AuthSession | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    return null;
  }
}
