import { notFound } from "next/navigation";
import { publicReceipt } from "@/lib/receipts";
import { ReceiptView } from "@/components/receipt-view";
import { normalizePhone } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const receipt = await publicReceipt(token);
  if (!receipt) notFound();
  return (
    <main className="receipt-page">
      <ReceiptView
        receipt={receipt}
        whatsapp={normalizePhone(process.env.RUNDORI_WHATSAPP_NUMBER ?? "")}
      />
    </main>
  );
}
