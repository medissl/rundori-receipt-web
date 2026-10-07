import "server-only";
import type { Receipt } from "./domain";
import { photoUrl, storageReady } from "./storage";
export async function withPhotos(receipt: Receipt) {
  return {
    ...receipt,
    receipt_items: await Promise.all(
      receipt.receipt_items.map(async (item) => ({
        ...item,
        item_photos: await Promise.all(
          (item.item_photos ?? []).map(async (photo) => ({
            ...photo,
            url:
              storageReady() && photo.object_key
                ? await photoUrl(photo.object_key)
                : "",
          })),
        ),
      })),
    ),
  };
}
export async function publicReceipt(token: string): Promise<Receipt | null> {
  if (
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL
  )
    return null;
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/receipt-lookup`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
    },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Receipt lookup temporarily unavailable");
  return withPhotos(await response.json());
}
