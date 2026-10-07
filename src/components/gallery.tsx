"use client";
import { useState } from "react";
import type { Photo } from "@/lib/domain";
export function Gallery({ photos }: { photos: Photo[] }) {
  const [phase, setPhase] = useState<"before" | "after">("before");
  const [selected, setSelected] = useState<Photo | null>(null);
  const visible = photos.filter((p) => p.phase === phase && p.url);
  return (
    <>
      <div className="gallery-tabs" role="tablist" aria-label="Tahap perawatan">
        {(["before", "after"] as const).map((p) => (
          <button
            role="tab"
            aria-selected={phase === p}
            className={phase === p ? "selected" : ""}
            key={p}
            onClick={() => setPhase(p)}
          >
            {p === "before" ? "Sebelum" : "Sesudah"}
            <span>{photos.filter((photo) => photo.phase === p).length}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {visible.length ? (
          <div className="customer-gallery">
            {visible.map((photo, i) => (
              <button
                key={photo.id}
                className="gallery-photo"
                onClick={() => setSelected(photo)}
                aria-label={`Perbesar foto ${i + 1}`}
              >
                <img
                  src={photo.url}
                  alt={`Sepatu ${phase === "before" ? "sebelum" : "sesudah"} perawatan, foto ${i + 1}`}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="photo-empty">
            {phase === "after"
              ? "Hasil perawatan akan ditampilkan di sini."
              : "Dokumentasi foto belum tersedia."}
          </div>
        )}
      </div>
      {selected && (
        <dialog
          open
          className="lightbox"
          onKeyDown={(e) => {
            if (e.key === "Escape") setSelected(null);
          }}
        >
          <button
            autoFocus
            onClick={() => setSelected(null)}
            aria-label="Tutup foto"
          >
            Tutup ×
          </button>
          <img src={selected.url} alt="Detail dokumentasi sepatu" />
        </dialog>
      )}
      <div className="print-photos">
        {photos
          .filter((p) => p.url)
          .map((p) => (
            <figure key={p.id}>
              <img src={p.url} alt="Dokumentasi sepatu" />
              <figcaption>
                {p.phase === "before" ? "Sebelum" : "Sesudah"}
              </figcaption>
            </figure>
          ))}
      </div>
    </>
  );
}
