import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { UserProfile } from "./current-user.types";

export async function getFounderProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("role", "FOUNDER")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    fullName: data.full_name,
    username: data.username,
    email: data.email,
    role: data.role,
    avatarUrl: data.avatar_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    lastLogin: data.last_login,
  };
}

export async function getFounderDisplayName(): Promise<string> {
  const founder = await getFounderProfile();
  return founder?.fullName || founder?.username || "Founder";
}
