import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/supabaseAdmin";
import { verifyAndFulfill } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error: "Нэвтэрнэ үү." }, { status: 401 });

  const { paymentId } = await req.json().catch(() => ({}));
  if (!paymentId) return NextResponse.json({ error: "paymentId дутуу" }, { status: 400 });

  try {
    const r = await verifyAndFulfill(paymentId, user.id);
    if (r.status === "not_found") {
      return NextResponse.json({ error: "Төлбөр олдсонгүй" }, { status: 404 });
    }
    return NextResponse.json(r);
  } catch (e: any) {
    console.error("QPay check:", e);
    return NextResponse.json({ status: "pending", error: "Шалгахад алдаа гарлаа" }, { status: 502 });
  }
}