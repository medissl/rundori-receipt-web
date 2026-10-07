"use client";
import { useState } from "react";
export function LoginForm({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const data = new FormData(e.currentTarget);
        try {
          const r = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.get("email"),
              password: data.get("password"),
            }),
          });
          if (!r.ok)
            throw new Error("Email, kata sandi, atau akses staf belum valid.");
          window.location.assign("/admin");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Koneksi bermasalah");
          setBusy(false);
        }
      }}
    >
      <label>
        Email staf
        <input name="email" type="email" required autoComplete="username" />
      </label>
      <label>
        Kata sandi
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          minLength={8}
        />
      </label>
      {!configured && (
        <p className="notice">
          Koneksi database belum diaktifkan. Pemilik perlu menyelesaikan
          pengaturan Supabase sebelum staf dapat masuk.
        </p>
      )}
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <button className="full" disabled={busy || !configured}>
        {busy ? "Memeriksa…" : "Masuk ke studio →"}
      </button>
    </form>
  );
}
