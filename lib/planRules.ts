import { supabaseAdmin } from "./supabaseAdmin";
import { RENEW_WINDOW_DAYS } from "./pricing";

/** Худалдан авалт хийж болох эсэхийг шалгана. Боломжгүй бол шалтгааныг буцаана. */
export async function checkPlanPurchase(
  userId: string,
  planId: "business" | "enterprise"
): Promise<string | null> {
  await supabaseAdmin.rpc("expire_user_plan", { p_user: userId });

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("plan,plan_expires_at")
    .eq("id", userId)
    .single();

  if (prof && prof.plan !== "free" && prof.plan_expires_at) {
    const daysLeft = (new Date(prof.plan_expires_at).getTime() - Date.now()) / 86_400_000;

    if (prof.plan === "enterprise" && planId === "business") {
      return "Enterprise багц идэвхтэй байна.";
    }
    if (prof.plan === planId && daysLeft > RENEW_WINDOW_DAYS) {
      return `Таны багц идэвхтэй байна. Дуусахад ${RENEW_WINDOW_DAYS} хоног үлдсэний дараа сунгана уу.`;
    }
  }
  return null;
}