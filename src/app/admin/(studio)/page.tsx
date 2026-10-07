import Link from "next/link";
import { staff } from "@/lib/supabase";
import { money, statusLabel, type Status } from "@/lib/domain";
export default async function Dashboard() {
  const { client } = await staff();
  const [counts, recent] = await Promise.all([
    Promise.all(
      ["received", "cleaning", "ready"].map((status) =>
        client
          .from("receipts")
          .select("id", { head: true, count: "exact" })
          .eq("status", status),
      ),
    ),
    client
      .from("receipts")
      .select("id,receipt_number,customer_name,status,total,amount_paid")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  if (recent.error || counts.some((r) => r.error))
    throw new Error("Database unavailable");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">STUDIO OVERVIEW</span>
          <h1>Every pair. Every detail.</h1>
          <p>Pesanan hari ini, dalam satu tempat.</p>
        </div>
        <Link className="button" href="/admin/orders/new">
          + Pesanan baru
        </Link>
      </div>
      <div className="stats">
        {["received", "cleaning", "ready"].map((s, i) => (
          <Link
            href={`/admin/orders?status=${s}`}
            className={`stat ${i === 2 ? "lime" : ""}`}
            key={s}
          >
            <span className="eyebrow">{statusLabel[s as Status]}</span>
            <strong>{counts[i].count ?? 0}</strong>
            <small>Lihat pesanan →</small>
          </Link>
        ))}
      </div>
      <section className="card">
        <div className="section-heading">
          <h2>Pesanan terbaru</h2>
          <Link href="/admin/orders">Lihat semua →</Link>
        </div>
        {recent.data?.length ? (
          <div className="order-list">
            {recent.data.map((r) => (
              <Link
                className="order-row"
                key={r.id}
                href={`/admin/orders/${r.id}`}
              >
                <div>
                  <strong>{r.customer_name}</strong>
                  <small>{r.receipt_number}</small>
                </div>
                <span className={`badge ${r.status}`}>
                  {statusLabel[r.status as Status]}
                </span>
                <strong>{money(r.total)}</strong>
                <span>↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h3>Siap untuk pasangan pertama.</h3>
            <p>
              Buat pesanan, dokumentasikan perawatan, dan kirim struk digital.
            </p>
            <Link href="/admin/orders/new" className="button">
              Buat pesanan pertama →
            </Link>
          </div>
        )}
      </section>
      <div className="studio-note">
        <span className="eyebrow">GOOD CARE STARTS HERE.</span>
        <p>
          Foto sebelum perawatan membantu mendokumentasikan kondisi sepatu
          dengan jelas.
        </p>
      </div>
    </>
  );
}
