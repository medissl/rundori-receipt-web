import Link from "next/link";
import { staff } from "@/lib/supabase";
import {
  money,
  dateLabel,
  statuses,
  statusLabel,
  type Status,
} from "@/lib/domain";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "")
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 80);
  const status = statuses.find((s) => s === params.status);
  const page = Math.max(
    1,
    Math.min(100000, parseInt(params.page ?? "1", 10) || 1),
  );
  const { client } = await staff();
  let query = client
    .from("receipts")
    .select(
      "id,receipt_number,customer_name,status,total,amount_paid,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q)
    query = query.or(`customer_name.ilike.%${q}%,receipt_number.ilike.%${q}%`);
  const { data, count, error } = await query.range(
    (page - 1) * 30,
    page * 30 - 1,
  );
  if (error) throw error;
  const pageUrl = (n: number) =>
    `/admin/orders?${new URLSearchParams({ q, status: status ?? "", page: String(n) })}`;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ORDER BOOK</span>
          <h1>Pesanan.</h1>
          <p>{count ?? 0} pesanan ditemukan</p>
        </div>
        <Link className="button" href="/admin/orders/new">
          + Pesanan baru
        </Link>
      </div>
      <form className="filters">
        <label className="search-label">
          Cari pelanggan / nomor struk
          <input
            name="q"
            defaultValue={q}
            placeholder="Nama pelanggan atau RND…"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">Semua status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <button>Cari</button>
      </form>
      <section className="card">
        {data?.length ? (
          <div className="order-list">
            {data.map((r) => (
              <Link
                className="order-row"
                key={r.id}
                href={`/admin/orders/${r.id}`}
              >
                <div>
                  <strong>{r.customer_name}</strong>
                  <small>
                    {r.receipt_number} · {dateLabel(r.created_at)}
                  </small>
                </div>
                <span className={`badge ${r.status}`}>
                  {statusLabel[r.status as Status]}
                </span>
                <div>
                  <strong>{money(r.total)}</strong>
                  <small>
                    {r.total - r.amount_paid
                      ? `Sisa ${money(r.total - r.amount_paid)}`
                      : "Lunas"}
                  </small>
                </div>
                <span>↗</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>Belum ada pesanan.</h2>
            <p>Coba pencarian lain atau buat pesanan baru.</p>
          </div>
        )}
      </section>
      <div className="pagination">
        {page > 1 && <Link href={pageUrl(page - 1)}>← Sebelumnya</Link>}
        <span>Halaman {page}</span>
        {page * 30 < (count ?? 0) && (
          <Link href={pageUrl(page + 1)}>Berikutnya →</Link>
        )}
      </div>
    </>
  );
}
