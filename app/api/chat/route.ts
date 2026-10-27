import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserFromRequest } from "@/lib/supabaseAdmin";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 120;

const MODELS = ["gemini-3.8-flash", "gemini-2.5-flash"];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const isTemporary = (msg: string) =>
  /503|429|overloaded|high demand|UNAVAILABLE|fetch failed|ECONNRESET|ETIMEDOUT/i.test(msg);

async function generateWithRetry(prompt: string) {
  let lastErr: any;
  for (const name of MODELS) {
    const model = genAI.getGenerativeModel({ model: name });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await model.generateContent(prompt);
      } catch (e: any) {
        lastErr = e;
        if (!isTemporary(String(e?.message ?? ""))) throw e;
        await sleep(1500 * 2 ** attempt);
      }
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  // 1. Нэвтэрсэн эсэхийг шалгана
  const user = await getUserFromRequest(req);
  if (!user) {
    return NextResponse.json({ error: "Асуулт асуухын тулд нэвтэрнэ үү." }, { status: 401 });
  }

  try {
    const { question, tenderText } = await req.json();

    if (!question || !tenderText) {
      return NextResponse.json({ error: "Асуулт эсвэл тендерийн мэдээлэл олдсонгүй." }, { status: 400 });
    }

    // 2. Оролтын хэмжээг хязгаарлана (зардлаас хамгаална)
    if (String(question).length > 1000) {
      return NextResponse.json({ error: "Асуулт хэт урт байна (1000 тэмдэгтээс хэтрэхгүй)." }, { status: 400 });
    }

    const prompt = `
Та бол Монгол Улсын тендерийн мэргэжилтэн хиймэл интеллект туслах юм.
Доор өгөгдсөн тендерийн баримт бичгийн хүрээнд хэрэглэгчийн асуусан асуултад тодорхой, ойлгомжтой, үнэн зөвөөр монгол хэлээр хариулна уу.

Тендерийн баримт бичиг:
${String(tenderText).slice(0, 30000)}

Хэрэглэгчийн асуулт:
${question}
`;

    const result = await generateWithRetry(prompt);
    return NextResponse.json({ success: true, answer: result.response.text() });
  } catch (error: any) {
    console.error("Chat error:", error);
    const busy = isTemporary(String(error?.message ?? ""));
    return NextResponse.json(
      {
        error: busy
          ? "AI үйлчилгээ одоогоор ачаалалтай байна. Хэдэн секундын дараа дахин оролдоно уу."
          : "Асуултад хариулахад алдаа гарлаа: " + error.message,
      },
      { status: busy ? 503 : 500 }
    );
  }
}