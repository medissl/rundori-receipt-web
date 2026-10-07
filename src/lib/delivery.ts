import "server-only";
import { normalizePhone, money, type Receipt } from "./domain";
export type DeliveryChannel = "link" | "email" | "whatsapp";
export const emailReady = () =>
  !!(process.env.RESEND_API_KEY && process.env.RESEND_FROM);
export const whatsappReady = () =>
  !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM &&
    process.env.TWILIO_CONTENT_SID
  );
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function deliver(
  channel: DeliveryChannel,
  r: Receipt,
  url: string,
  operation: string,
): Promise<{
  status: "sent" | "failed" | "skipped" | "prepared";
  detail: string;
}> {
  if (channel === "link")
    return { status: "prepared", detail: "Link siap dibagikan oleh staf." };
  if (channel === "email") {
    if (!emailReady() || !r.email)
      return {
        status: "skipped",
        detail:
          "Email belum dikonfigurasi atau alamat pelanggan kosong. Gunakan salin link.",
      };
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
          "Idempotency-Key": operation,
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM,
          to: [r.email],
          subject: `Struk Rundori · ${r.receipt_number}`,
          text: `Halo ${r.customer_name}, terima kasih telah mempercayakan sepatu Anda kepada Rundori. Struk: ${url}\nTotal: ${money(r.total)}\nRundori Shoe Care Studio · @rundori.id`,
          html: `<div style="background:#f4f4ef;padding:32px;font-family:Arial,sans-serif;color:#1b1b18"><div style="max-width:520px;margin:auto;background:white;border-radius:20px;overflow:hidden"><div style="background:#d4e866;padding:32px"><h1 style="margin:0;letter-spacing:-2px">RUNDORI</h1><p style="font-size:11px;letter-spacing:3px">SHOE CARE STUDIO</p></div><div style="padding:32px"><h2>Terima kasih, ${escapeHtml(r.customer_name)}.</h2><p>Perawatan sepatu Anda, tercatat dengan rapi. Lihat detail pesanan dan dokumentasi foto melalui struk digital Anda.</p><p><b>${escapeHtml(r.receipt_number)} · ${money(r.total)}</b></p><a style="display:inline-block;padding:16px 24px;background:#1b1b18;color:white;border-radius:10px;text-decoration:none" href="${escapeHtml(url)}">Lihat struk Anda →</a><p style="font-size:12px;color:#777;margin-top:28px">Link ini bersifat pribadi. Simpan dan bagikan hanya kepada orang yang Anda percaya.</p><p style="font-size:12px">Rundori Shoe Care Studio · @rundori.id</p></div></div></div>`,
        }),
        signal: AbortSignal.timeout(15000),
      });
      return response.ok
        ? {
            status: "sent",
            detail:
              "Email diterima oleh penyedia. Pengiriman ke inbox belum terverifikasi.",
          }
        : {
            status: "failed",
            detail:
              "Penyedia email menolak pengiriman. Periksa domain dan konfigurasi Resend.",
          };
    } catch {
      return {
        status: "failed",
        detail:
          "Koneksi email gagal. Gunakan salin link atau coba kirim ulang.",
      };
    }
  }
  if (!whatsappReady() || !r.phone)
    return {
      status: "skipped",
      detail:
        "WhatsApp otomatis belum dikonfigurasi. Gunakan tombol WhatsApp manual.",
    };
  // Business-initiated WhatsApp uses an approved utility template, not free-form text.
  const body = new URLSearchParams({
    To: `whatsapp:+${normalizePhone(r.phone)}`,
    From: process.env.TWILIO_WHATSAPP_FROM!,
    ContentSid: process.env.TWILIO_CONTENT_SID!,
    ContentVariables: JSON.stringify({
      "1": r.customer_name,
      "2": r.receipt_number,
      "3": new URL(url).pathname.slice(3),
    }),
  });
  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: AbortSignal.timeout(15000),
      },
    );
    return response.ok
      ? {
          status: "sent",
          detail:
            "WhatsApp diterima oleh penyedia; belum merupakan konfirmasi terkirim.",
        }
      : {
          status: "failed",
          detail:
            "WhatsApp ditolak. Periksa sender dan template utility yang disetujui.",
        };
  } catch {
    return {
      status: "failed",
      detail:
        "Koneksi WhatsApp gagal. Periksa log Twilio sebelum mengirim ulang.",
    };
  }
}
