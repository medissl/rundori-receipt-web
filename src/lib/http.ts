import { NextResponse } from "next/server";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin)
    throw new Error("UNAUTHORIZED");
}
export function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return NextResponse.json(
    {
      error:
        message === "UNAUTHORIZED"
          ? "Akses ditolak."
          : message.startsWith("R2")
            ? message
            : "Tidak dapat menyimpan. Muat ulang lalu coba lagi.",
    },
    { status: message === "UNAUTHORIZED" ? 403 : 400 },
  );
}
