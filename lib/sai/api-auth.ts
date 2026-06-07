import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  SAI_AUTH_COOKIE,
  SAI_USER_COOKIE,
  sessionFromCookie,
  type AuthSession,
} from "@/lib/sai/auth";

export async function getApiSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  if (cookieStore.get(SAI_AUTH_COOKIE)?.value !== "authenticated") return null;
  return sessionFromCookie(cookieStore.get(SAI_USER_COOKIE)?.value);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function requireSession() {
  const session = await getApiSession();
  if (!session) return { session: null, error: unauthorized() };
  return { session, error: null };
}

export async function requireOwner() {
  const { session, error } = await requireSession();
  if (error) return { session: null, error };
  if (session!.role !== "owner") return { session: null, error: forbidden() };
  return { session: session!, error: null };
}
