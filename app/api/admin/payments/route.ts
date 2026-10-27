import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabaseAdmin";

// GET: Төлбөрийн хүсэлтүүдийг status-аар харах (зөвхөн админ)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if ("error" in admin) return admin.error;

  const status = req.nextUrl.searchParams.get("status") ?? "pending";
  if (!["pending", "approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "status буруу байна." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("payment_requests")
    .select(
      "id, plan, amount, status, created_at, reviewed_at, profiles!payment_requests_user_id_fkey(email, full_name, ref_code)"
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" })
    .limit(100);

  if (error) {
    console.error("admin payments list:", error.message);
    return NextResponse.json({ error: "Жагсаалт уншихад алдаа гарлаа." }, { status: 500 });
  }

  return NextResponse.json({ rows: data ?? [] });
}