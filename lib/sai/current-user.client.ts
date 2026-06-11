import { createSupabaseBrowser } from "@/lib/supabase/client";
import type { CurrentUser, UserProfile, UserRole } from "./current-user.types";

type ProfileRow = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  last_login: string | null;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLogin: row.last_login,
  };
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = createSupabaseBrowser();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("AUTH USER:", user ? { id: user.id, email: user.email } : null);
  if (error) {
    console.log("[getCurrentUser:client] auth error:", error.message);
  }

  if (error || !user) return null;

  const { data, error: profileError } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  let profileRow = data;

  if (!profileRow && user.email) {
    const { data: byEmail } = await supabase
      .from("user_profiles")
      .select("*")
      .ilike("email", user.email)
      .maybeSingle();
    profileRow = byEmail;
    if (byEmail && byEmail.id !== user.id) {
      console.log("[getCurrentUser:client] ID MISMATCH — resolved by email:", {
        authUserId: user.id,
        profileId: byEmail.id,
      });
    }
  }

  if (profileError) {
    console.log("[getCurrentUser:client] profile error:", profileError.message);
  }

  const profile = profileRow ? mapProfile(profileRow as ProfileRow) : null;

  console.log(
    "PROFILE:",
    profile
      ? {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          fullName: profile.fullName,
        }
      : null,
  );
  console.log("ID MATCH:", profile ? user.id === profile.id : false);

  if (!profile) return null;

  return { user, profile, role: profile.role };
}
