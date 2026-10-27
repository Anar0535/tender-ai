const BASE = (process.env.QPAY_BASE_URL || "https://merchant.qpay.mn/v2").replace(/\/$/, "");

let cache: { token: string; exp: number } | null = null;

async function getToken(force = false) {
  if (!force && cache && cache.exp > Date.now() + 60_000) return cache.token;

  const basic = Buffer.from(
    `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`
  ).toString("base64");

  const res = await fetch(`${BASE}/auth/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`QPay нэвтрэлт амжилтгүй: ${res.status}`);

  const d = await res.json();
  // expires_in нь секундын зөрүү эсвэл unix timestamp байж болох тул хоёуланг нь зохицуулна
  const exp = d.expires_in > 1e9 ? d.expires_in * 1000 : Date.now() + (d.expires_in ?? 3600) * 1000;
  cache = { token: d.access_token, exp };
  return cache.token;
}

async function qpay<T>(path: string, body: unknown): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const token = await getToken(attempt > 0);
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (res.status === 401 && attempt === 0) continue; // token хуучирсан бол шинээр авч дахин оролдоно
    const text = await res.text();
    if (!res.ok) throw new Error(`QPay ${path} алдаа ${res.status}: ${text.slice(0, 300)}`);
    return JSON.parse(text) as T;
  }
  throw new Error("QPay хүсэлт амжилтгүй");
}

export interface QPayInvoice {
  invoice_id: string;
  qr_text: string;
  qr_image: string; // base64 PNG
  qPay_shortUrl: string;
  urls: { name: string; description?: string; logo?: string; link: string }[];
}

export const createInvoice = (p: {
  senderInvoiceNo: string;
  description: string;
  amount: number;
  callbackUrl: string;
}) =>
  qpay<QPayInvoice>("/invoice", {
    invoice_code: process.env.QPAY_INVOICE_CODE,
    sender_invoice_no: p.senderInvoiceNo,
    invoice_receiver_code: "terminal",
    invoice_description: p.description,
    amount: p.amount,
    callback_url: p.callbackUrl,
  });

export async function isInvoicePaid(invoiceId: string, expectedAmount: number) {
  const r = await qpay<{
    count: number;
    paid_amount?: number;
    rows?: { payment_status: string; payment_amount?: number | string }[];
  }>("/payment/check", {
    object_type: "INVOICE",
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });

  const paidRows = (r.rows ?? []).filter((x) => x.payment_status === "PAID");
  const paid =
    r.paid_amount ?? paidRows.reduce((s, x) => s + Number(x.payment_amount ?? 0), 0);
  return paidRows.length > 0 && paid >= expectedAmount;
}