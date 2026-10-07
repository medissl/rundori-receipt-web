"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressPhoto } from "@/lib/compress";
import type { Item } from "@/lib/domain";
export function PhotoUploader({
  item,
  enabled,
}: {
  item: Item;
  enabled: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function upload(files: FileList | null, phase: string) {
    if (!files?.length) return;
    setBusy(true);
    setMessage("");
    let completed = 0;
    try {
      for (const f of Array.from(files)) {
        setMessage(`Memproses foto ${completed + 1} / ${files.length}…`);
        const blob = await compressPhoto(f);
        const data = new FormData();
        data.set("item_id", item.id);
        data.set("phase", phase);
        data.set("file", blob, "shoe.webp");
        const res = await fetch("/api/admin/photos", {
          method: "POST",
          body: data,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error);
        completed++;
      }
      setMessage(`${completed} foto tersimpan.`);
    } catch (err) {
      setMessage(
        `${completed} foto tersimpan. ${err instanceof Error ? err.message : "Upload gagal"}`,
      );
    } finally {
      setBusy(false);
      router.refresh();
    }
  }
  return (
    <div className="photo-uploader">
      <div className="photo-columns">
        {(["before", "after"] as const).map((phase) => (
          <section key={phase}>
            <span className="eyebrow">
              {phase === "before" ? "SEBELUM PERAWATAN" : "SESUDAH PERAWATAN"}
            </span>
            <div className="photo-grid">
              {item.item_photos
                .filter((p) => p.phase === phase)
                .map((p) => (
                  <div className="photo-tile" key={p.id}>
                    {p.url ? (
                      <img
                        src={p.url}
                        alt={`Foto sepatu ${phase === "before" ? "sebelum" : "sesudah"} perawatan`}
                        loading="lazy"
                      />
                    ) : (
                      <span>Foto belum tersedia</span>
                    )}
                    <button
                      className="photo-remove"
                      disabled={busy}
                      aria-label="Hapus foto"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const res = await fetch("/api/admin/photos", {
                            method: "DELETE",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ id: p.id }),
                          });
                          if (!res.ok)
                            throw new Error((await res.json()).error);
                          setMessage("Foto dihapus.");
                        } catch (err) {
                          setMessage(
                            err instanceof Error
                              ? err.message
                              : "Gagal menghapus foto",
                          );
                        } finally {
                          setBusy(false);
                          router.refresh();
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
            <label
              className={`upload-drop ${!enabled || busy ? "disabled" : ""}`}
            >
              + Pilih foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                multiple
                disabled={!enabled || busy}
                onChange={(e) => {
                  void upload(e.target.files, phase);
                  e.target.value = "";
                }}
              />
            </label>
            <label className="camera-link">
              Ambil foto
              <input
                type="file"
                accept="image/*"
                capture="environment"
                disabled={!enabled || busy}
                onChange={(e) => {
                  void upload(e.target.files, phase);
                  e.target.value = "";
                }}
              />
            </label>
          </section>
        ))}
      </div>
      <p className="muted" role="status">
        {message ||
          "Foto otomatis diubah ke WebP, diperkecil, dan dikompres sebelum diunggah."}
      </p>
      {!enabled && (
        <p className="notice">
          Penyimpanan R2 belum diaktifkan. Foto dapat ditambahkan setelah
          pengaturan selesai.
        </p>
      )}
    </div>
  );
}
