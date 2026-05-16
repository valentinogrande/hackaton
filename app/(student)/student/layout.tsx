import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RoleNav } from "@/components/role-nav";
import { readCurrentStreak } from "@/lib/data/streaks";
import { streakMultiplier } from "@/lib/tokens/economy";

export default async function StudentLayout({
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
  if (profile?.role !== "student") redirect(`/${profile?.role ?? "login"}`);

  const days = await readCurrentStreak(user.id);
  const { multiplier, tier } = streakMultiplier(days);

  return (
    <div className="flex-1 flex">
      <RoleNav
        role="student"
        fullName={profile.full_name}
        streak={{ days, multiplier, tier }}
      />
      <div className="flex-1 p-6 overflow-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
        {children}
      </div>
    </div>
  );
}
