import { z } from "zod";
export const statuses = [
  "received",
  "cleaning",
  "ready",
  "collected",
  "cancelled",
] as const;
export type Status = (typeof statuses)[number];
export const statusLabel: Record<Status, string> = {
  received: "Diterima",
  cleaning: "Dalam perawatan",
  ready: "Siap diambil",
  collected: "Sudah diambil",
  cancelled: "Dibatalkan",
};
export const money = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export const dateLabel = (s: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeZone: "Asia/Jakarta",
  }).format(new Date(s));
export function normalizePhone(p: string) {
  const n = p.replace(/[\s()+-]/g, "");
  return n.startsWith("0") ? `62${n.slice(1)}` : n;
}
export const itemSchema = z.object({
  id: z.uuid(),
  service_name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500),
  quantity: z.number().int().min(1).max(100),
  unit_price: z.number().int().min(0).max(100000000),
});
export const orderSchema = z
  .object({
    id: z.uuid(),
    version: z.string().optional(),
    customer_name: z.string().trim().min(1).max(120),
    phone: z
      .string()
      .trim()
      .max(25)
      .refine(
        (v) => !v || /^[0-9+ ()-]+$/.test(v),
        "Nomor telepon tidak valid",
      ),
    email: z.union([z.email(), z.literal("")]),
    notes: z.string().trim().max(2000),
    internal_notes: z.string().trim().max(2000),
    status: z.enum(statuses),
    payment_method: z.enum(["QRIS", "Cash", "Transfer", "Other"]),
    amount_paid: z.number().int().min(0).max(1000000000),
    items: z.array(itemSchema).min(1).max(20),
  })
  .refine((v) => v.phone || v.email, {
    message: "Isi WhatsApp atau email pelanggan",
    path: ["phone"],
  })
  .refine(
    (v) =>
      v.amount_paid <=
      v.items.reduce((n, i) => n + i.quantity * i.unit_price, 0),
    { message: "Pembayaran melebihi total", path: ["amount_paid"] },
  );
export type OrderInput = z.infer<typeof orderSchema>;
export type Photo = {
  id: string;
  item_id: string;
  phase: "before" | "after";
  url: string;
  object_key?: string;
};
export type Item = z.infer<typeof itemSchema> & { item_photos: Photo[] };
export type Receipt = {
  id: string;
  receipt_number: string;
  customer_name: string;
  phone?: string;
  email?: string;
  notes: string;
  internal_notes?: string;
  status: Status;
  payment_method: string;
  total: number;
  amount_paid: number;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  receipt_items: Item[];
  delivery_logs?: {
    id: string;
    channel: string;
    status: string;
    created_at: string;
    detail: string;
  }[];
};
