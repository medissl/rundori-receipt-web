import { NextResponse } from "next/server";
import { apiStaff } from "@/lib/supabase";
import { orderSchema } from "@/lib/domain";
import { sameOrigin, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { client } = await apiStaff();
    const input = orderSchema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json(
        { error: input.error.issues[0].message },
        { status: 400 },
      );
    const { data, error } = await client.rpc("save_order", {
      payload: input.data,
    });
    if (error)
      return NextResponse.json(
        {
          error: error.message.includes("STALE")
            ? "Pesanan telah diubah staf lain. Muat ulang sebelum menyimpan."
            : "Pesanan gagal disimpan. Coba lagi.",
        },
        { status: 409 },
      );
    return NextResponse.json({ id: data });
  } catch (error) {
    return failure(error);
  }
}
