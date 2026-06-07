import { NextResponse } from "next/server";
import {
  OWNER_SESSION,
  SAI_AUTH_COOKIE,
  SAI_USER_COOKIE,
  validateCredentials,
} from "@/lib/sai/auth";

export async function POST(request: Request) {
  const body = await request.json();
  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password || !validateCredentials(username, password)) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ user: OWNER_SESSION });

  response.cookies.set(SAI_AUTH_COOKIE, "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  response.cookies.set(SAI_USER_COOKIE, JSON.stringify(OWNER_SESSION), {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return response;
}
