import { NextResponse } from "next/server";
import { SAI_AUTH_COOKIE, SAI_USER_COOKIE } from "@/lib/sai/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });

  response.cookies.set(SAI_AUTH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set(SAI_USER_COOKIE, "", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
