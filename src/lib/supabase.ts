import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export function configured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export async function db() {
  if (!configured()) throw new Error("Supabase belum dikonfigurasi.");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot persist cookies; proxy refreshes sessions. */
          }
        },
      },
    },
  );
}
export async function staff() {
  if (!configured()) redirect("/admin/login");
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data } = await client
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!data) redirect("/admin/login?error=access");
  return { client, user };
}
export async function apiStaff() {
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("UNAUTHORIZED");
  const { data } = await client
    .from("staff_members")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!data) throw new Error("UNAUTHORIZED");
  return { client, user };
}
