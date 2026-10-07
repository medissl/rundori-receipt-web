"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { money, normalizePhone, type Receipt } from "@/lib/domain";
export function ConfirmSend({
  receipt: r,
  emailEnabled,
  whatsappEnabled,
}: {
  receipt: Receipt;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
}) {
  const router = useRouter();
  const [review, setReview] = useState(false);
  const [ack, setAck] = useState(false);
  const [channel, setChannel] = useState("link");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="card confirmation">
      <span className="eyebrow">03 / REVIEW & SEND</span>
      <h2>Siap dikirim?</h2>
      <p>
        Periksa nama, layanan, pembayaran, dan foto sebelum membagikan struk.
      </p>
      {!review ? (
        <button onClick={() => setReview(true)}>Periksa & konfirmasi →</button>
      ) : (
        <div className="review-panel">
          <dl className="totals">
            <div>
              <dt>Pelanggan</dt>
              <dd>{r.customer_name}</dd>
            </div>
            <div>
              <dt>Kontak</dt>
              <dd>{r.phone || r.email}</dd>
            </div>
            <div>
              <dt>Item / foto</dt>
              <dd>
                {r.receipt_items.length} /{" "}
                {r.receipt_items.reduce((n, i) => n + i.item_photos.length, 0)}
              </dd>
            </div>
            <div>
              <dt>Total</dt>
              <dd>{money(r.total)}</dd>
            </div>
            <div>
              <dt>Sisa</dt>
              <dd>{money(r.total - r.amount_paid)}</dd>
            </div>
          </dl>
          <label>
            Cara pengiriman
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              disabled={busy}
            >
              <option value="link">Salin link / WhatsApp manual</option>
              <option value="email" disabled={!emailEnabled || !r.email}>
                Email{" "}
                {!emailEnabled
                  ? "(belum dikonfigurasi)"
                  : !r.email
                    ? "(email pelanggan kosong)"
                    : ""}
              </option>
              <option value="whatsapp" disabled={!whatsappEnabled || !r.phone}>
                WhatsApp otomatis{" "}
                {!whatsappEnabled
                  ? "(belum dikonfigurasi)"
                  : !r.phone
                    ? "(telepon kosong)"
                    : ""}
              </option>
            </select>
          </label>
          {!emailEnabled && (
            <p className="muted">
              Email otomatis belum aktif. Salin link tetap tersedia.
            </p>
          )}
          {!whatsappEnabled && (
            <p className="muted">
              WhatsApp otomatis belum aktif. Tombol WhatsApp manual tersedia
              setelah konfirmasi.
            </p>
          )}
          {r.has_active_link && (
            <p className="notice">
              Konfirmasi baru membuat link baru dan menonaktifkan link
              sebelumnya.
            </p>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={ack}
              disabled={busy}
              onChange={(e) => setAck(e.target.checked)}
            />
            Detail dan foto sudah saya periksa. Struk siap dibagikan.
          </label>
          <div className="button-row">
            <button
              disabled={!ack || busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                setMessage("");
                try {
                  const response = await fetch(
                    `/api/admin/orders/${r.id}/confirm`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        channel,
                        operation: crypto.randomUUID(),
                        version: r.updated_at,
                      }),
                    },
                  );
                  const data = await response.json();
                  if (!response.ok) throw new Error(data.error);
                  setUrl(data.url);
                  setMessage(data.detail);
                  setReview(false);
                  setAck(false);
                  router.refresh();
                } catch (err) {
                  setError(
                    err instanceof Error ? err.message : "Koneksi bermasalah",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy
                ? "Memproses…"
                : channel === "link"
                  ? "Konfirmasi & buat link"
                  : "Konfirmasi & kirim"}
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setReview(false);
                setAck(false);
              }}
            >
              Kembali
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      {url && (
        <div className="link-result">
          <p role="status">{message}</p>
          <label>
            Link struk pribadi
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <div className="button-row">
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(url);
                  setMessage("Link disalin.");
                } catch {
                  setMessage("Pilih dan salin link secara manual.");
                }
              }}
            >
              Salin link
            </button>
            {r.phone && (
              <a
                className="button secondary"
                target="_blank"
                rel="noreferrer"
                href={`https://wa.me/${normalizePhone(r.phone)}?text=${encodeURIComponent(`Halo ${r.customer_name}, ini struk perawatan sepatu Anda di Rundori: ${url}`)}`}
              >
                Buka WhatsApp ↗
              </a>
            )}
            <a
              className="text-button"
              target="_blank"
              rel="noreferrer"
              href={url}
            >
              Lihat struk ↗
            </a>
          </div>
          <small>
            Link hanya ditampilkan saat ini. Simpan link sebelum meninggalkan
            halaman.
          </small>
        </div>
      )}
      {r.has_active_link && (
        <details className="revoke-details">
          <summary>Nonaktifkan link pelanggan</summary>
          <p>Link aktif tidak dapat dibuka lagi setelah dinonaktifkan.</p>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await fetch(`/api/admin/orders/${r.id}/revoke`, {
                  method: "POST",
                });
                if (!res.ok) throw new Error("Gagal menonaktifkan link.");
                setUrl("");
                setMessage("Link dinonaktifkan.");
                router.refresh();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Gagal");
              } finally {
                setBusy(false);
              }
            }}
          >
            Nonaktifkan sekarang
          </button>
        </details>
      )}
    </section>
  );
}
