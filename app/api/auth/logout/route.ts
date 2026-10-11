import { NextResponse } from "next/server";
import { AUTH_COOKIE, getAuthCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_COOKIE, "", {
    ...getAuthCookieOptions(0),
    maxAge: 0,
  });
  return response;
}
