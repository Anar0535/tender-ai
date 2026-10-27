import { supabaseAdmin } from "./supabaseAdmin";
import { isInvoicePaid } from "./qpay";

/** QPay-ээс төлбөрийг шалгаж, төлөгдсөн бол багцыг нэг удаа идэвхжүүлнэ. */
export async function verifyAndFulfill(paymentId: string, userId?: string) {
  let q = supabaseAdmin
    .from("payments")
    .select("id,user_id,amount,status,qpay_invoice_id")
    .eq("id", paymentId);
  if (userId) q = q.eq("user_id", userId);

  const { data: p } = await q.maybeSingle();
  if (!p) return { status: "not_found" as const };

  if (p.status !== "paid") {
    if (!p.qpay_invoice_id) return { status: "pending" as const };

    const paid = await isInvoicePaid(p.qpay_invoice_id, p.amount);
    if (!paid) return { status: "pending" as const };

    const { error } = await supabaseAdmin.rpc("fulfill_payment", { p_payment: p.id });
    if (error) throw new Error(error.message);
  }

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("credits,plan,plan_expires_at")
    .eq("id", p.user_id)
    .single();

  return {
    status: "paid" as const,
    credits: prof?.credits ?? 0,
    plan: (prof?.plan ?? "free") as "free" | "business" | "enterprise",
    expiresAt: prof?.plan_expires_at ?? null,
  };
}