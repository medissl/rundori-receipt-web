import { staff } from "@/lib/supabase";
import { storageReady } from "@/lib/storage";
import { emailReady, whatsappReady } from "@/lib/delivery";
export default async function Settings() {
  await staff();
  const services = [
    [
      "Database & login staf",
      true,
      "Supabase Auth dengan daftar staf yang diizinkan.",
    ],
    [
      "Foto sepatu / R2",
      storageReady(),
      "Bucket privat; foto dikompres di ponsel sebelum diunggah.",
    ],
    [
      "Email / Resend",
      emailReady(),
      "Pengiriman link menggunakan domain pengirim terverifikasi.",
    ],
    [
      "WhatsApp otomatis / Twilio",
      whatsappReady(),
      "Memerlukan sender WhatsApp dan template utility yang disetujui.",
    ],
    [
      "WhatsApp studio",
      !!process.env.RUNDORI_WHATSAPP_NUMBER,
      "Nomor kontak studio pada struk pelanggan.",
    ],
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">STUDIO SETTINGS</span>
          <h1>Koneksi studio.</h1>
          <p>
            Status konfigurasi layanan. Kredensial dikelola oleh pemilik studio.
          </p>
        </div>
      </div>
      <section className="card">
        {services.map(([name, ready, detail]) => (
          <div className="setting-row" key={String(name)}>
            <div>
              <h3>{name}</h3>
              <p className="muted">{detail}</p>
            </div>
            <span className={`badge ${ready ? "ready" : "received"}`}>
              {ready ? "Dikonfigurasi" : "Belum aktif"}
            </span>
          </div>
        ))}
      </section>
      <section className="card">
        <span className="eyebrow">BRAND / CONTACT</span>
        <h2>Rundori Shoe Care Studio</h2>
        <p>
          Ruko Grand Poris, Blok A10 No.19A, Cipondoh, Kota Tangerang, Banten
          15148
        </p>
        <p>@rundori.id</p>
        <p className="muted">
          Tambahkan akun staf melalui Supabase Auth dan daftar staf. Tidak ada
          pendaftaran pelanggan.
        </p>
      </section>
    </>
  );
}
