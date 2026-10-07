"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  type Receipt,
  type OrderInput,
  type Status,
  orderSchema,
  money,
  statuses,
  statusLabel,
} from "@/lib/domain";
const freshItem = () => ({
  id: crypto.randomUUID(),
  service_name: "Deep Cleaning",
  description: "",
  quantity: 1,
  unit_price: 0,
});
export function OrderForm({ receipt }: { receipt?: Receipt }) {
  const router = useRouter();
  const [form, setForm] = useState<OrderInput>(() =>
    receipt
      ? {
          id: receipt.id,
          version: receipt.updated_at,
          customer_name: receipt.customer_name,
          phone: receipt.phone ?? "",
          email: receipt.email ?? "",
          notes: receipt.notes,
          internal_notes: receipt.internal_notes ?? "",
          status: receipt.status,
          payment_method:
            receipt.payment_method as OrderInput["payment_method"],
          amount_paid: receipt.amount_paid,
          items: receipt.receipt_items.map((i) => ({
            id: i.id,
            service_name: i.service_name,
            description: i.description,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        }
      : {
          id: crypto.randomUUID(),
          customer_name: "",
          phone: "",
          email: "",
          notes: "",
          internal_notes: "",
          status: "received",
          payment_method: "QRIS",
          amount_paid: 0,
          items: [freshItem()],
        },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const total = form.items.reduce((n, i) => n + i.unit_price * i.quantity, 0);
  function update<K extends keyof OrderInput>(key: K, value: OrderInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function item(index: number, key: string, value: string | number) {
    setForm((f) => ({
      ...f,
      items: f.items.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }
  return (
    <form
      className="order-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        const parsed = orderSchema.safeParse(form);
        if (!parsed.success) {
          setError(parsed.error.issues[0].message);
          return;
        }
        setBusy(true);
        try {
          const res = await fetch("/api/admin/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed.data),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          router.push(`/admin/orders/${data.id}`);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Koneksi bermasalah");
        } finally {
          setBusy(false);
        }
      }}
    >
      <fieldset className="card" disabled={busy}>
        <legend>01 / Pelanggan</legend>
        <div className="form-grid">
          <label>
            Nama pelanggan
            <input
              required
              maxLength={120}
              value={form.customer_name}
              onChange={(e) => update("customer_name", e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            WhatsApp
            <input
              type="tel"
              value={form.phone}
              maxLength={25}
              onChange={(e) => update("phone", e.target.value)}
              autoComplete="tel"
              placeholder="08… atau +62…"
            />
          </label>
          <label>
            Email <span className="muted">(opsional)</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(e) => update("status", e.target.value as Status)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabel[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <small className="muted">
          Isi setidaknya satu kontak: WhatsApp atau email.
        </small>
      </fieldset>
      <fieldset className="card" disabled={busy}>
        <legend>02 / Sepatu & layanan</legend>
        {form.items.map((v, i) => (
          <div className="item-editor" key={v.id}>
            <div className="section-heading">
              <span className="eyebrow">
                ITEM {String(i + 1).padStart(2, "0")}
              </span>
              {form.items.length > 1 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    update(
                      "items",
                      form.items.filter((_, index) => index !== i),
                    )
                  }
                >
                  Hapus item
                </button>
              )}
            </div>
            <div className="form-grid">
              <label>
                Layanan
                <input
                  required
                  list="services"
                  value={v.service_name}
                  maxLength={120}
                  onChange={(e) => item(i, "service_name", e.target.value)}
                />
              </label>
              <label>
                Detail sepatu
                <input
                  value={v.description}
                  maxLength={500}
                  placeholder="Merek, warna, ukuran, kondisi…"
                  onChange={(e) => item(i, "description", e.target.value)}
                />
              </label>
              <label>
                Jumlah
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={v.quantity}
                  onChange={(e) => item(i, "quantity", Number(e.target.value))}
                />
              </label>
              <label>
                Harga per item (Rp)
                <input
                  type="number"
                  min={0}
                  step={1}
                  max={100000000}
                  required
                  value={v.unit_price}
                  onChange={(e) =>
                    item(i, "unit_price", Number(e.target.value))
                  }
                />
              </label>
            </div>
            <p className="item-subtotal">
              Subtotal <strong>{money(v.quantity * v.unit_price)}</strong>
            </p>
          </div>
        ))}
        <datalist id="services">
          <option>Deep Cleaning</option>
          <option>Special Treatment</option>
          <option>Unyellowing</option>
          <option>Repaint</option>
        </datalist>
        <button
          type="button"
          className="secondary"
          disabled={form.items.length >= 20}
          onClick={() => update("items", [...form.items, freshItem()])}
        >
          + Tambah item
        </button>
        <p className="muted">
          Simpan detail terlebih dahulu, lalu unggah foto sebelum / sesudah
          untuk setiap item.
        </p>
      </fieldset>
      <fieldset className="card" disabled={busy}>
        <legend>03 / Pembayaran & catatan</legend>
        <div className="form-grid">
          <label>
            Metode pembayaran
            <select
              value={form.payment_method}
              onChange={(e) =>
                update(
                  "payment_method",
                  e.target.value as OrderInput["payment_method"],
                )
              }
            >
              <option>QRIS</option>
              <option>Cash</option>
              <option>Transfer</option>
              <option>Other</option>
            </select>
          </label>
          <label>
            Jumlah dibayar (Rp)
            <input
              type="number"
              min={0}
              max={total}
              step={1}
              required
              value={form.amount_paid}
              onChange={(e) => update("amount_paid", Number(e.target.value))}
            />
          </label>
          <label>
            Catatan untuk pelanggan
            <textarea
              value={form.notes}
              maxLength={2000}
              rows={3}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Instruksi perawatan atau catatan kondisi…"
            />
          </label>
          <label>
            Catatan internal staf
            <textarea
              value={form.internal_notes}
              maxLength={2000}
              rows={3}
              onChange={(e) => update("internal_notes", e.target.value)}
              placeholder="Hanya terlihat oleh tim studio"
            />
          </label>
        </div>
      </fieldset>
      <div className="save-bar">
        <div>
          <small>TOTAL / SISA</small>
          <strong>
            {money(total)}{" "}
            <span className="muted">
              / {money(Math.max(0, total - form.amount_paid))}
            </span>
          </strong>
        </div>
        <button disabled={busy}>
          {busy
            ? "Menyimpan…"
            : receipt
              ? "Simpan perubahan →"
              : "Simpan & lanjut ke foto →"}
        </button>
      </div>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
