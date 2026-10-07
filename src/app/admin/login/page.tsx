import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { configured } from "@/lib/supabase";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="login-layout">
      <section className="login-brand">
        <Brand />
        <div>
          <span className="eyebrow">THE STUDIO / OPERATIONS</span>
          <h1>
            Care in every
            <br />
            detail.
          </h1>
          <p>
            Ruang kerja tim Rundori.
            <br />
            Dari sepatu masuk, sampai kembali seperti baru.
          </p>
        </div>
        <small>RUNDORI SHOE CARE STUDIO · TANGERANG</small>
      </section>
      <section className="login-panel">
        <span className="eyebrow">STAFF ACCESS</span>
        <h2>Selamat datang kembali.</h2>
        <p>Masuk untuk mengelola pesanan dan struk.</p>
        {error === "access" && (
          <p className="notice">
            Akun ini belum diberi akses staf. Hubungi pemilik studio.
          </p>
        )}
        <LoginForm configured={configured()} />
        <small className="muted">
          Akses hanya untuk staf yang diundang oleh Rundori.
        </small>
      </section>
    </main>
  );
}
