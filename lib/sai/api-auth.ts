import "server-only";

import { getCurrentUser } from "./current-user.server";
import {
  displayName,
  isAdminOrFounder,
  isFounder,
  type CurrentUser,
  type UserProfile,
} from "./current-user.types";

export type { CurrentUser, UserProfile, UserRole } from "./current-user.types";
export {
  displayName,
  isAdmin,
  isAdminOrFounder,
  isEmployee,
  isFounder,
  roleLabel,
} from "./current-user.types";
export { getCurrentUser } from "./current-user.server";

/** @deprecated Use getCurrentUser() */
export async function getSession(): Promise<{
  id: string;
  username: string;
  name: string;
  role: "owner" | "employee" | "admin";
  title: string;
  department: string;
  email: string;
  avatarUrl: string | null;
} | null> {
  const ctx = await getCurrentUser();
  if (!ctx) return null;

  const legacyRole =
    ctx.profile.role === "FOUNDER"
      ? "owner"
      : ctx.profile.role === "ADMIN"
        ? "admin"
        : "employee";

  return {
    id: ctx.user.id,
    username: ctx.profile.username,
    name: ctx.profile.fullName || ctx.profile.username,
    role: legacyRole,
    title: ctx.profile.role === "FOUNDER" ? "Founder" : ctx.profile.role === "ADMIN" ? "Admin" : "Employee",
    department: "SAI",
    email: ctx.profile.email,
    avatarUrl: ctx.profile.avatarUrl,
  };
}

export async function requireAuth(): Promise<CurrentUser | null> {
  return getCurrentUser();
}

export async function requireFounder(): Promise<CurrentUser | null> {
  const ctx = await getCurrentUser();
  if (!ctx || !isFounder(ctx.profile)) return null;
  return ctx;
}

export async function requireAdmin(): Promise<CurrentUser | null> {
  const ctx = await getCurrentUser();
  if (!ctx || !isAdminOrFounder(ctx.profile)) return null;
  return ctx;
}

/** @deprecated Use requireFounder() */
export async function requireOwner(): Promise<CurrentUser | null> {
  return requireFounder();
}
