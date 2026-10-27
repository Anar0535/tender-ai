import { NextRequest, NextResponse } from "next/server";
import { verifyAndFulfill } from "@/lib/payments";

// QPay callback-ийн биеийг ЯМАР Ч ТОХИОЛДОЛД итгэхгүй.
// Зөвхөн pid-ээр төлбөрийг олж, QPay-ийн payment/check-ээр баталгаажуулна.
async function handle(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get("pid");

  if (pid && /^[0-9a-f-]{36}$/i.test(pid)) {
    try {
      await verifyAndFulfill(pid);
    } catch (e) {
      console.error("QPay webhook:", e);
      return new NextResponse("ERROR", { status: 500 });
    }
  }
  return new NextResponse("SUCCESS", { status: 200 });
}

export const GET = handle;
export const POST = handle;