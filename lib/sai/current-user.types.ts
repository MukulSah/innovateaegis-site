export type UserRole = "FOUNDER" | "ADMIN" | "EMPLOYEE";

export interface UserProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
}

export interface CurrentUser {
  user: { id: string; email?: string };
  profile: UserProfile;
  role: UserRole;
}

export function isFounder(profile: UserProfile | null | undefined): boolean {
  return profile?.role === "FOUNDER";
}

export function isAdmin(profile: UserProfile | null | undefined): boolean {
  return profile?.role === "ADMIN";
}

export function isEmployee(profile: UserProfile | null | undefined): boolean {
  return profile?.role === "EMPLOYEE";
}

export function isAdminOrFounder(profile: UserProfile | null | undefined): boolean {
  return isFounder(profile) || isAdmin(profile);
}

export function displayName(profile: UserProfile): string {
  return profile.fullName || profile.username || profile.email;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "FOUNDER":
      return "Founder";
    case "ADMIN":
      return "Admin";
    default:
      return "Employee";
  }
}
