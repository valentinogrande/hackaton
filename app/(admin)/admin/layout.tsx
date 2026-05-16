import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleNav } from "@/components/role-nav";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect(`/${profile?.role ?? "login"}`);

  return (
    <div className="flex-1 flex">
      <RoleNav role="admin" fullName={profile.full_name} />
      <div className="flex-1 p-6 overflow-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300">{children}</div>
    </div>
  );
}
