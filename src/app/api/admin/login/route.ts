import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const input = z
      .object({
        email: z.email().max(254),
        password: z.string().min(8).max(200),
      })
      .parse(await request.json());
    const client = await db();
    const { data, error } = await client.auth.signInWithPassword(input);
    if (error || !data.user)
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    const { data: member } = await client
      .from("staff_members")
      .select("user_id")
      .eq("user_id", data.user.id)
      .eq("active", true)
      .maybeSingle();
    if (!member) {
      await client.auth.signOut();
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
