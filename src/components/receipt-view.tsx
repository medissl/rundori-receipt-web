import { Brand } from "./brand";
import { Gallery } from "./gallery";
import { PrintButton } from "./print-button";
import { dateLabel, money, statusLabel, type Receipt } from "@/lib/domain";
export function ReceiptView({
  receipt,
  whatsapp,
  preview = false,
}: {
  receipt: Receipt;
  whatsapp: string;
  preview?: boolean;
}) {
  const r = receipt;
  const balance = r.total - r.amount_paid;
  return (
    <article className="receipt">
      <header className="receipt-hero">
        <Brand />
        <div className="hero-copy">
          <span className="eyebrow">YOUR PAIR. OUR CARE.</span>
          <h1>
            Terima kasih,
            <br />
            {r.customer_name}.
          </h1>
          <p>
            Setiap detail, kami rawat.
            <br />
            Ini perjalanan perawatan sepatu Anda.
          </p>
        </div>
        <div className="hero-bottom">
          <span>STRUK DIGITAL</span>
          <span>EST. TANGERANG</span>
        </div>
      </header>
      <div className="receipt-body">
        {preview && (
          <div className="notice">Pratinjau staf · Struk belum dikirim</div>
        )}
        <section className="receipt-summary">
          <div>
            <span className="eyebrow">ORDER / {r.receipt_number}</span>
            <h2>Pesanan Anda.</h2>
            <p>
              {dateLabel(r.created_at)} ·{" "}
              {r.receipt_items.reduce((n, i) => n + i.quantity, 0)} item
            </p>
          </div>
          <span className={`badge ${r.status}`}>{statusLabel[r.status]}</span>
        </section>
        <section className="receipt-section">
          <span className="eyebrow">01 / THE TRANSFORMATION</span>
          <h2>Detail perawatan.</h2>
          <p className="muted">
            Dokumentasi sebelum dan sesudah, untuk setiap pasang.
          </p>
          {r.receipt_items.map((item, index) => (
            <section className="receipt-item" key={item.id}>
              <div className="section-heading">
                <span className="item-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{item.service_name}</h3>
                  <p>{item.description || "Perawatan sepatu"}</p>
                </div>
                <span className="quantity">{item.quantity}×</span>
              </div>
              <Gallery photos={item.item_photos} />
            </section>
          ))}
        </section>
        <section className="receipt-section payment-card">
          <span className="eyebrow">02 / YOUR RECEIPT</span>
          <h2>Rincian pembayaran.</h2>
          <div className="receipt-lines">
            {r.receipt_items.map((i) => (
              <div key={i.id}>
                <span>
                  {i.quantity}× {i.service_name}
                  <small>{money(i.unit_price)} / item</small>
                </span>
                <strong>{money(i.quantity * i.unit_price)}</strong>
              </div>
            ))}
          </div>
          <dl className="totals">
            <div>
              <dt>Total tagihan</dt>
              <dd>{money(r.total)}</dd>
            </div>
            <div>
              <dt>Sudah dibayar</dt>
              <dd>{money(r.amount_paid)}</dd>
            </div>
            <div className="balance">
              <dt>Sisa tagihan</dt>
              <dd>{money(balance)}</dd>
            </div>
          </dl>
          <dl className="payment-meta">
            <div>
              <dt>Metode pembayaran</dt>
              <dd>{r.payment_method}</dd>
            </div>
            <div>
              <dt>Tanggal pesanan</dt>
              <dd>{dateLabel(r.created_at)}</dd>
            </div>
          </dl>
          <span className={`badge ${balance === 0 ? "ready" : "received"}`}>
            {balance === 0 ? "LUNAS" : "BELUM LUNAS"}
          </span>
        </section>
        {r.notes && (
          <section className="receipt-section">
            <span className="eyebrow">CARE NOTES</span>
            <p className="notes">{r.notes}</p>
          </section>
        )}
        <section className="contact-card">
          <span className="eyebrow">LET’S TALK</span>
          <h2>
            Ada yang ingin
            <br />
            ditanyakan?
          </h2>
          <p>Tim Rundori siap membantu Anda.</p>
          <a
            href={
              whatsapp
                ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Halo Rundori, saya ingin bertanya tentang pesanan ${r.receipt_number}.`)}`
                : "https://wa.me/message/YGRSC4P2ZLWBI1?src=qr"
            }
            className="button full"
            rel="noreferrer"
            target="_blank"
          >
            Hubungi via WhatsApp ↗
          </a>
          <PrintButton />
        </section>
        <footer className="receipt-footer">
          <strong>RUNDORI</strong>
          <span>SHOE CARE STUDIO</span>
          <p>
            Ruko Grand Poris, Blok A10 No.19A
            <br />
            Cipondoh, Kota Tangerang, Banten 15148
          </p>
          <a
            href="https://www.instagram.com/rundori.id/"
            target="_blank"
            rel="noreferrer"
          >
            @rundori.id ↗
          </a>
          <small>Link struk ini bersifat pribadi.</small>
        </footer>
      </div>
    </article>
  );
}
