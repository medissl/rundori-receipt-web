import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await (await db()).auth.signOut();
    return NextResponse.redirect(new URL("/admin/login", request.url), 303);
  } catch (error) {
    return failure(error);
  }
}
