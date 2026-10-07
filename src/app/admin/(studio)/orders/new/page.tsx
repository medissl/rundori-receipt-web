import { OrderForm } from "@/components/order-form";
import { staff } from "@/lib/supabase";
export default async function NewOrder() {
  await staff();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">01 / ORDER DETAILS</span>
          <h1>Pesanan baru.</h1>
          <p>Catat pelanggan dan detail setiap pasang sepatu.</p>
        </div>
      </div>
      <OrderForm />
    </>
  );
}
