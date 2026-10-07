"use client";
export function PrintButton() {
  return (
    <button
      className="secondary full print-button"
      onClick={() => window.print()}
    >
      Cetak / simpan sebagai PDF
    </button>
  );
}
