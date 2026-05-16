// Friendly display for a user profile.
// Cascade: full_name → email → short id.
export function userDisplayName(u: {
  full_name?: string | null;
  email?: string | null;
  id?: string;
}): string {
  if (u.full_name && u.full_name.trim()) return u.full_name.trim();
  if (u.email && u.email.trim()) return u.email.trim();
  return u.id ? `Usuario ${u.id.slice(0, 8)}` : "—";
}
