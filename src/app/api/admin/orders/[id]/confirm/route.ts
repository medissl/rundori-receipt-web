import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
import { deliver } from "@/lib/delivery";
import type { Receipt } from "@/lib/domain";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const { client } = await apiStaff();
    const { id } = await params;
    z.uuid().parse(id);
    const input = z
      .object({
        channel: z.enum(["link", "email", "whatsapp"]),
        operation: z.uuid(),
        version: z.string().min(1),
      })
      .parse(await request.json());
    const { data, error } = await client
      .from("receipts")
      .select("*,receipt_items(*)")
      .eq("id", id)
      .single();
    if (error || !data) throw new Error("UNAUTHORIZED");
    const base = process.env.APP_URL;
    if (!base || !/^https?:\/\//.test(base)) throw new Error("APP_URL missing");
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const prepared = await client.rpc("prepare_delivery", {
      rid: id,
      hash,
      operation: input.operation,
      channel_name: input.channel,
      expected_version: input.version,
    });
    if (prepared.error)
      return NextResponse.json(
        {
          error:
            "Pesanan berubah atau konfirmasi sudah diproses. Muat ulang sebelum mencoba lagi.",
        },
        { status: 409 },
      );
    const url = `${base.replace(/\/$/, "")}/r/${token}`;
    const result = await deliver(
      input.channel,
      data as Receipt,
      url,
      input.operation,
    );
    const logged = await client
      .from("delivery_logs")
      .update(result)
      .eq("id", input.operation);
    return NextResponse.json({
      url,
      ...result,
      ...(logged.error
        ? {
            detail: `${result.detail} Riwayat belum dapat diperbarui; jangan kirim ulang sebelum memeriksa penyedia.`,
          }
        : {}),
    });
  } catch (error) {
    return failure(error);
  }
}
