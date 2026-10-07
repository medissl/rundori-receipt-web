import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiStaff } from "@/lib/supabase";
import { sameOrigin, failure } from "@/lib/http";
import { putPhoto, deletePhoto } from "@/lib/storage";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client } = await apiStaff();
    if (Number(request.headers.get("content-length") ?? 0) > 1000000)
      throw new Error("Too large");
    const form = await request.formData();
    const item = z.uuid().parse(form.get("item_id"));
    const phase = z.enum(["before", "after"]).parse(form.get("phase"));
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > 800000 ||
      file.type !== "image/webp"
    )
      return NextResponse.json(
        { error: "Pilih foto WebP yang sudah dikompres (maks. 800 KB)." },
        { status: 400 },
      );
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (
      Buffer.from(bytes.slice(0, 4)).toString() !== "RIFF" ||
      Buffer.from(bytes.slice(8, 12)).toString() !== "WEBP"
    )
      throw new Error("Invalid image");
    const { data } = await client
      .from("receipt_items")
      .select("receipt_id")
      .eq("id", item)
      .single();
    if (!data) throw new Error("UNAUTHORIZED");
    const { count } = await client
      .from("item_photos")
      .select("id", { count: "exact", head: true })
      .eq("item_id", item)
      .eq("phase", phase);
    if ((count ?? 0) >= 12)
      return NextResponse.json(
        { error: "Maksimum 12 foto per tahap per item." },
        { status: 400 },
      );
    const key = `orders/${data.receipt_id}/${item}/${phase}/${randomUUID()}.webp`;
    await putPhoto(key, bytes);
    const result = await client
      .from("item_photos")
      .insert({ item_id: item, phase, object_key: key, bytes: file.size });
    if (result.error) {
      await deletePhoto(key).catch(() => {});
      throw result.error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { client } = await apiStaff();
    const { id } = z.object({ id: z.uuid() }).parse(await request.json());
    const { data } = await client
      .from("item_photos")
      .select("object_key")
      .eq("id", id)
      .single();
    if (!data) throw new Error("UNAUTHORIZED");
    await deletePhoto(data.object_key);
    const { error } = await client.from("item_photos").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
