import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Зөвхөн сервер дээр (API route) ашиглана. Browser-т хэзээ ч импортлохгүй.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error || !data.user ? null : data.user;
}

/** Админ эрхтэй эсэхийг шалгана. Эрхгүй бол шууд буцаах хариуг өгнө. */
export async function requireAdmin(
  req: Request
): Promise<{ user: User } | { error: NextResponse }> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { error: NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 }) };
  }
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!data?.is_admin) {
    return { error: NextResponse.json({ error: "Админ эрхгүй байна." }, { status: 403 }) };
  }
  return { user };
}