import Link from "next/link";
import { staff } from "@/lib/supabase";
import { Brand } from "@/components/brand";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await staff();
  return (
    <div className="studio">
      <aside className="sidebar">
        <Brand compact />
        <span className="eyebrow muted">STUDIO WORKSPACE</span>
        <nav aria-label="Navigasi studio">
          <Link href="/admin">Dashboard</Link>
          <Link href="/admin/orders">Orders</Link>
          <Link href="/admin/orders/new" className="nav-create">
            + New order
          </Link>
          <Link href="/admin/settings">Settings</Link>
        </nav>
        <div className="sidebar-foot">
          <small>{user.email}</small>
          <form action="/api/admin/logout" method="post">
            <button className="text-button">Keluar</button>
          </form>
        </div>
      </aside>
      <div className="studio-main">
        <header className="topbar">
          <span className="eyebrow">RUNDORI / SHOE CARE STUDIO</span>
          <span className="staff-pill">STAF</span>
        </header>
        <main className="workspace">{children}</main>
      </div>
    </div>
  );
}
