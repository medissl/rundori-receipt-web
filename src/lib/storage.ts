import "server-only";
import { createHmac } from "node:crypto";
export const storageReady = () =>
  !!(process.env.PHOTO_GATEWAY_URL && process.env.PHOTO_GATEWAY_SECRET);
function signedUrl(key: string, method: string) {
  if (!storageReady())
    throw new Error("R2 belum dikonfigurasi. Foto belum dapat diunggah.");
  if (
    !/^orders\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/(before|after)\/[a-f0-9-]{36}\.webp$/.test(
      key,
    )
  )
    throw new Error("Invalid photo key");
  const path = `/photos/${key}`;
  const expires = String(Math.floor(Date.now() / 1000) + 600);
  const signature = createHmac("sha256", process.env.PHOTO_GATEWAY_SECRET!)
    .update(`${method}\n${path}\n${expires}`)
    .digest("hex");
  return `${process.env.PHOTO_GATEWAY_URL!.replace(/\/$/, "")}${path}?expires=${expires}&signature=${signature}`;
}
export async function photoUrl(key: string) {
  return signedUrl(key, "GET");
}
export async function putPhoto(key: string, body: Uint8Array) {
  const r = await fetch(signedUrl(key, "PUT"), {
    method: "PUT",
    headers: { "Content-Type": "image/webp" },
    body: Buffer.from(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error("R2 gagal menyimpan foto. Coba lagi.");
}
export async function deletePhoto(key: string) {
  const r = await fetch(signedUrl(key, "DELETE"), {
    method: "DELETE",
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("R2 gagal menghapus foto. Coba lagi.");
}
