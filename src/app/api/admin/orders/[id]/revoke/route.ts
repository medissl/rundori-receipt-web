import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
import { z } from "zod";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { client } = await apiStaff();
    const { id } = await params;
    z.uuid().parse(id);
    const { error } = await client
      .from("receipts")
      .update({ public_token_hash: null, token_expires_at: null })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
