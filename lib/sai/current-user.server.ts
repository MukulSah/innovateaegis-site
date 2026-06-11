import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdmin, isSupabaseAuthConfigured, isSupabaseConfigured } from "@/lib/supabase/admin";
import { createSupabaseServer } from "@/lib/supabase/server";
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

async function queryProfile(
  supabase: SupabaseClient,
  userId: string,
  email?: string,
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.log("[getProfileByUserId] profile query error:", error.message);
    return null;
  }

  if (data) {
    return mapProfile(data as ProfileRow);
  }

  if (email) {
    const { data: byEmail, error: emailError } = await supabase
      .from("user_profiles")
      .select("*")
      .ilike("email", email)
      .maybeSingle();

    if (emailError) {
      console.log("[getProfileByUserId] email fallback error:", emailError.message);
      return null;
    }

    if (byEmail) {
      console.log("[getProfileByUserId] ID MISMATCH — resolved by email:", {
        authUserId: userId,
        profileId: byEmail.id,
        authEmail: email,
        profileEmail: byEmail.email,
      });
      return mapProfile(byEmail as ProfileRow);
    }
  }

  return null;
}

export async function getProfileByUserId(
  userId: string,
  options?: { email?: string; supabase?: SupabaseClient },
): Promise<UserProfile | null> {
  if (options?.supabase) {
    const profile = await queryProfile(options.supabase, userId, options.email);
    if (profile) return profile;
  }

  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  return queryProfile(supabase, userId, options?.email);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!isSupabaseAuthConfigured()) {
    console.log("[getCurrentUser] Supabase auth env vars missing");
    return null;
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("AUTH USER:", user ? { id: user.id, email: user.email } : null);
  if (error) {
    console.log("[getCurrentUser] auth error:", error.message);
  }

  if (error || !user) return null;

  const profile = await getProfileByUserId(user.id, {
    email: user.email ?? undefined,
    supabase,
  });

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

export async function touchLastLogin(userId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  await supabase
    .from("user_profiles")
    .update({ last_login: new Date().toISOString() })
    .eq("id", userId);
}

export async function createUserProfile(input: {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role?: UserRole;
}): Promise<UserProfile> {
  const supabase = createSupabaseAdmin();

  const { count } = await supabase
    .from("user_profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "FOUNDER");

  const role: UserRole =
    input.role ?? ((count ?? 0) === 0 ? "FOUNDER" : "EMPLOYEE");

  const { data, error } = await supabase
    .from("user_profiles")
    .insert({
      id: input.id,
      full_name: input.fullName,
      username: input.username,
      email: input.email,
      role,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapProfile(data as ProfileRow);
}
