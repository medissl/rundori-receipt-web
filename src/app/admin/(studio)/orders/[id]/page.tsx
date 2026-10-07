import { notFound } from "next/navigation";
import { staff } from "@/lib/supabase";
import { withPhotos } from "@/lib/receipts";
import { storageReady } from "@/lib/storage";
import { emailReady, whatsappReady } from "@/lib/delivery";
import { OrderForm } from "@/components/order-form";
import { PhotoUploader } from "@/components/photos";
import { ConfirmSend } from "@/components/confirm-send";
import { ReceiptView } from "@/components/receipt-view";
import {
  dateLabel,
  statusLabel,
  type Receipt,
  normalizePhone,
} from "@/lib/domain";
export default async function Order({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) notFound();
  const { client } = await staff();
  const { data, error } = await client
    .from("receipts")
    .select(
      "id,receipt_number,customer_name,phone,email,notes,internal_notes,status,payment_method,total,amount_paid,created_at,updated_at,confirmed_at,token_expires_at,receipt_items(id,service_name,description,quantity,unit_price,position,item_photos(id,item_id,phase,object_key)),delivery_logs(id,channel,status,detail,created_at)",
    )
    .eq("id", id)
    .single();
  if (error || !data) notFound();
  data.receipt_items.sort((a, b) => a.position - b.position);
  const r = await withPhotos(data as unknown as Receipt);
  r.has_active_link =
    !!data.token_expires_at &&
    new Date(data.token_expires_at).getTime() > Date.now();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{r.receipt_number}</span>
          <h1>{r.customer_name}.</h1>
          <p>
            {dateLabel(r.created_at)} ·{" "}
            {r.has_active_link
              ? "Struk aktif"
              : r.confirmed_at
                ? "Link tidak aktif"
                : "Draft · belum dikirim"}
          </p>
        </div>
        <span className={`badge ${r.status}`}>{statusLabel[r.status]}</span>
      </div>
      <details className="card edit-details">
        <summary>Edit detail pesanan & status</summary>
        <OrderForm key={r.updated_at} receipt={r} />
      </details>
      <section className="card">
        <span className="eyebrow">02 / PHOTO DOCUMENTATION</span>
        <h2>Dokumentasi sepatu.</h2>
        <p className="muted">
          Pilih beberapa foto atau gunakan kamera ponsel. Maksimum 12 foto per
          tahap per item.
        </p>
        {r.receipt_items.map((item, i) => (
          <section className="photo-item" key={item.id}>
            <h3>
              {String(i + 1).padStart(2, "0")} / {item.service_name}
            </h3>
            <p>{item.description}</p>
            <PhotoUploader item={item} enabled={storageReady()} />
          </section>
        ))}
      </section>
      <ConfirmSend
        receipt={r}
        emailEnabled={emailReady()}
        whatsappEnabled={whatsappReady()}
      />
      <details className="card preview-details">
        <summary>Pratinjau struk pelanggan</summary>
        <ReceiptView
          receipt={r}
          whatsapp={normalizePhone(process.env.RUNDORI_WHATSAPP_NUMBER ?? "")}
          preview
        />
      </details>
      <section className="card">
        <span className="eyebrow">DELIVERY HISTORY</span>
        <h2>Riwayat pengiriman.</h2>
        {r.delivery_logs?.length ? (
          <div className="delivery-history">
            {r.delivery_logs
              .toSorted((a, b) => b.created_at.localeCompare(a.created_at))
              .map((log) => (
                <div key={log.id}>
                  <strong>
                    {log.channel} / {log.status}
                  </strong>
                  <p>
                    {log.detail ||
                      "Permintaan disiapkan. Jika status belum berubah, periksa penyedia sebelum mengirim ulang."}
                  </p>
                  <small>{dateLabel(log.created_at)}</small>
                </div>
              ))}
          </div>
        ) : (
          <p className="muted">
            Belum ada pengiriman. Periksa detail, lalu konfirmasi.
          </p>
        )}
      </section>
    </>
  );
}
