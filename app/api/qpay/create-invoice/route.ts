import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabaseAdmin";
import { createInvoice } from "@/lib/qpay";
import { PLANS, RENEW_WINDOW_DAYS } from "@/lib/pricing";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
 const planId = body?.plan as "business" | "enterprise" | undefined;
if (planId !== "business" && planId !== "enterprise") {
  return NextResponse.json({ error: "Багц буруу байна." }, { status: 400 });
}
const plan = PLANS[planId];

  // Одоогийн багцыг шалгана (үнийг, дүрмийг сервер дээр тогтооно)
  await supabaseAdmin.rpc("expire_user_plan", { p_user: user.id });
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("plan,plan_expires_at")
    .eq("id", user.id)
    .single();

  if (prof && prof.plan !== "free" && prof.plan_expires_at) {
    const daysLeft = (new Date(prof.plan_expires_at).getTime() - Date.now()) / 86_400_000;

    if (prof.plan === "enterprise" && planId === "business") {
      return NextResponse.json({ error: "Enterprise багц идэвхтэй байна." }, { status: 409 });
    }
    if (prof.plan === planId && daysLeft > RENEW_WINDOW_DAYS) {
      return NextResponse.json(
        { error: `Таны багц идэвхтэй байна. Дуусахад ${RENEW_WINDOW_DAYS} хоног үлдсэний дараа сунгана уу.` },
        { status: 409 }
      );
    }
  }

  const { data: payment, error: insErr } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: user.id,
      plan: planId,
      amount: plan.price,
      credits: plan.credits,
    })
    .select("id")
    .single();

  if (insErr || !payment) {
    console.error("payments insert:", insErr?.message);
    return NextResponse.json({ error: "Төлбөр үүсгэхэд алдаа гарлаа." }, { status: 500 });
  }

  try {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");

    const invoice = await createInvoice({
      senderInvoiceNo: payment.id,
      description: plan.description,
      amount: plan.price,
      callbackUrl: `${site}/api/qpay/webhook?pid=${payment.id}`,
    });

    await supabaseAdmin
      .from("payments")
      .update({ qpay_invoice_id: invoice.invoice_id })
      .eq("id", payment.id);

    return NextResponse.json({
      paymentId: payment.id,
      qrImage: invoice.qr_image,
      qrText: invoice.qr_text,
      shortUrl: invoice.qPay_shortUrl,
      urls: invoice.urls ?? [],
    });
  } catch (e: any) {
    console.error("QPay create invoice:", e);
    await supabaseAdmin.from("payments").delete().eq("id", payment.id);
    return NextResponse.json(
      { error: "QPay нэхэмжлэх үүсгэхэд алдаа гарлаа. Дахин оролдоно уу." },
      { status: 502 }
    );
  }
}