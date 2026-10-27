import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabaseAdmin";
import { PLANS } from "@/lib/pricing";
import { checkPlanPurchase } from "@/lib/planRules";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const planId = body?.plan as "business" | "enterprise" | undefined;
  if (planId !== "business" && planId !== "enterprise") {
    return NextResponse.json({ error: "Багц буруу байна." }, { status: 400 });
  }
  const plan = PLANS[planId];

  const blocked = await checkPlanPurchase(user.id, planId);
  if (blocked) {
    return NextResponse.json({ error: blocked }, { status: 409 });
  }

  // Нэг хэрэглэгч зэрэг нэг л хүлээгдэж буй хүсэлттэй байна
  const { data: existing, error: findErr } = await supabaseAdmin
    .from("payment_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (findErr) {
    console.error("payment_requests find:", findErr.message);
    return NextResponse.json({ error: "Хүсэлт шалгахад алдаа гарлаа." }, { status: 500 });
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("payment_requests")
      .update({ plan: planId, amount: plan.price })
      .eq("id", existing.id);
    if (error) {
      console.error("payment_requests update:", error.message);
      return NextResponse.json({ error: "Хүсэлт шинэчлэхэд алдаа гарлаа." }, { status: 500 });
    }
    return NextResponse.json({ id: existing.id, status: "pending", updated: true });
  }

  const { data, error } = await supabaseAdmin
    .from("payment_requests")
    .insert({ user_id: user.id, plan: planId, amount: plan.price })
    .select("id")
    .single();

  if (error || !data) {
    console.error("payment_requests insert:", error?.message);
    return NextResponse.json({ error: "Хүсэлт илгээхэд алдаа гарлаа." }, { status: 500 });
  }

  return NextResponse.json({ id: data.id, status: "pending" });
}