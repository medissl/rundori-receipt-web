"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="quiet">
      <span className="eyebrow">RUNDORI</span>
      <h1>Sebentar, ya.</h1>
      <p>Koneksi sedang bermasalah. Silakan coba lagi.</p>
      <button onClick={reset}>Coba lagi</button>
    </main>
  );
}
