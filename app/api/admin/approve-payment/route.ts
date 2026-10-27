import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if ("error" in admin) return admin.error;

  const { requestId, action } = await req.json().catch(() => ({}));
  if (typeof requestId !== "string" || !UUID.test(requestId) || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Мэдээлэл дутуу байна." }, { status: 400 });
  }

  if (action === "approve") {
    // Статус солих, багц идэвхжүүлэх, эрх нэмэх бүгд нэг SQL транзакцид
    const { data: ok, error } = await supabaseAdmin.rpc("approve_payment_request", {
      p_request: requestId,
      p_admin: admin.user.id,
    });
    if (error) {
      console.error("approve_payment_request:", error.message);
      return NextResponse.json({ error: "Батлахад алдаа гарлаа." }, { status: 500 });
    }
    if (!ok) {
      return NextResponse.json(
        { error: "Хүсэлт аль хэдийн шийдвэрлэгдсэн эсвэл олдсонгүй." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true, message: "Амжилттай баталгаажлаа." });
  }

  const { data, error } = await supabaseAdmin
    .from("payment_requests")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.user.id,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id");

  if (error) {
    console.error("reject payment:", error.message);
    return NextResponse.json({ error: "Татгалзахад алдаа гарлаа." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Хүсэлт аль хэдийн шийдвэрлэгдсэн эсвэл олдсонгүй." },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: true, message: "Татгалзлаа." });
}