import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserFromRequest, supabaseAdmin } from "@/lib/supabaseAdmin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 300;

const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"]; // үндсэн, нөөц

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTemporary = (msg: string) =>
  /503|429|overloaded|high demand|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);

async function generateWithRetry(parts: any[]) {
  let lastErr: any;
  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({
      model: name,
      generationConfig: { responseMimeType: "application/json" },
    });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await model.generateContent(parts);
      } catch (e: any) {
        lastErr = e;
        if (!isTemporary(String(e?.message ?? ""))) throw e;
        await sleep(1500 * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

const PROMPT = `
Та бол Монгол Улсын Худалдан авах ажиллагаа болон Тендерийн шинжээч хиймэл интеллект юм.
Өгөгдсөн тендерийн баримт бичгийг сайтар судалж шинжлээд заавал ЗӨВХӨН JSON форматаар хариулт өгнө үү. Илүү текст болон тайлбар бичиж болохгүй.

Эрсдэл бүрийн "level"-ийг дараах утгуудын нэгээр л бичнэ: "high" (хүнд, тендерээс хасагдах эсвэл их хохирол учруулах), "medium" (анхаарах шаардлагатай), "low" (бага зэрэг).

JSON формат:
{
  "tender_title": "Тендерийн нэр эсвэл сэдэв",
  "required_documents": ["Бүрдүүлэх бичиг баримт 1", "Бүрдүүлэх бичиг баримт 2"],
  "key_requirements": ["Гол шалгуур үзүүлэлт 1", "Гол шалгуур үзүүлэлт 2"],
  "potential_risks": [
    { "level": "high", "text": "Анхаарах эрсдэлтэй заалт 1" },
    { "level": "medium", "text": "Анхаарах эрсдэлтэй заалт 2" }
  ],
  "summary": "Тендерийн товч хураангуй"
}
`;

export async function POST(req: NextRequest) {
  // 1. Нэвтэрсэн эсэх
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Шинжилгээ хийхийн тулд нэвтэрнэ үү." }, { status: 401 });
  }

  let charged = false;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const pastedText = formData.get("text") as string | null;

    if (!file && !pastedText) {
      return NextResponse.json({ error: "Файл эсвэл текст олдсонгүй" }, { status: 400 });
    }

     // 2. Эрхийг атомаар хасна (Enterprise бол -1 буцаана, хасахгүй)
    const { data: remaining, error: creditErr } = await supabaseAdmin.rpc("consume_credit", {
      p_user: user.id,
    });
    if (creditErr) throw creditErr;

    if (remaining === null || remaining === undefined) {
      return NextResponse.json(
        {
          error: "Эрх дууссан эсвэл багцын хугацаа дууссан байна. Эрхээ цэнэглэнэ үү.",
          code: "NO_CREDITS",
        },
        { status: 403 }
      );
    }
    const unlimited = remaining === -1;
    charged = !unlimited; // Enterprise-д буцаах эрх байхгүй
    // 3. Gemini шинжилгээ
    const parts: any[] = [PROMPT];
    if (pastedText) {
      parts.push(`Тендерийн баримт бичгийн текст:\n${pastedText.slice(0, 50000)}`);
    } else if (file) {
      const base64Data = Buffer.from(await file.arrayBuffer()).toString("base64");
      parts.push({
        inlineData: { data: base64Data, mimeType: file.type || "application/pdf" },
      });
    }

    const result = await generateWithRetry(parts);
    const cleanJson = result.response.text().replace(/```json|```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return NextResponse.json({
      success: true,
      data: parsedData,
      credits: unlimited ? null : remaining,
      unlimited,
    });
  } catch (error: any) {
    console.error("Analysis error:", error);
    console.error("Cause:", error?.cause);

    // Шинжилгээ амжилтгүй бол эрхийг буцааж өгнө
    if (charged) {
      const { error: refundErr } = await supabaseAdmin.rpc("refund_credit", { p_user: user.id });
      if (refundErr) console.error("Refund failed:", refundErr.message);
    }

    const busy = isTemporary(String(error?.message ?? ""));
    return NextResponse.json(
      {
        error: busy
          ? "AI үйлчилгээ одоогоор ачаалалтай эсвэл холболт тасарлаа. Эрх тань буцаагдсан, хэдэн секундын дараа дахин оролдоно уу."
          : "Шинжилгээ хийхэд алдаа гарлаа (эрх буцаагдлаа): " + error.message,
      },
      { status: busy ? 503 : 500 }
    );
  }
}