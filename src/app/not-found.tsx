import { Brand } from "@/components/brand";
export default function NotFound() {
  return (
    <main className="quiet">
      <Brand />
      <span className="eyebrow">RUNDORI SHOE CARE STUDIO</span>
      <h1>Link tidak tersedia.</h1>
      <p>
        Struk ini tidak ditemukan atau link sudah kedaluwarsa.
        <br />
        Gunakan link yang dikirim oleh tim Rundori.
      </p>
    </main>
  );
}
