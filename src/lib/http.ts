import { NextResponse } from "next/server";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const target = new URL(request.url);
  // Next.js uses localhost internally in development. The browser's Host stays
  // authoritative; browser scripts cannot choose an arbitrary Host header.
  const host = request.headers.get('host');
  if (!origin || !host) throw new Error('UNAUTHORIZED');
  const source = new URL(origin);
  const expectedProtocol = process.env.NODE_ENV === 'production' ? 'https:' : target.protocol;
  if (source.host !== host || source.protocol !== expectedProtocol) throw new Error('UNAUTHORIZED');
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
