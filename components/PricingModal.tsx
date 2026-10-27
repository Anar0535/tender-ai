"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { BANK } from "@/lib/bankInfo";

type PlanId = "business" | "enterprise";
type CurrentPlan = "free" | "business" | "enterprise";

export interface PaidInfo {
  credits: number;
  plan: CurrentPlan;
  expiresAt: string | null;
}

interface PendingRequest {
  id: string;
  plan: PlanId;
  amount: number;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user?: any; //
  getToken: () => Promise<string | null>;
  notify: (type: "success" | "error" | "warning", text: string) => void;
  plan: CurrentPlan;
  planExpires: string | null;
  credits: number | null;
  /** QPay-ийн үед ашигласан. Одоо хэрэггүй, page.tsx-тэй нийцүүлэхийн тулд үлдээсэн. */
  onPaid?: (info: PaidInfo) => void;
}

const PLAN_INFO = {
  business: { name: "Business", price: 69000 },
  enterprise: { name: "Enterprise", price: 169000 },
} as const;

const RENEW_WINDOW_DAYS = 7;
const money = (n: number) => n.toLocaleString("en-US");

function CopyRow({
  label,
  value,
  copyValue,
  strong,
}: {
  label: string;
  value: string;
  copyValue?: string;
  strong?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(copyValue ?? value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard боломжгүй үед алгасна */
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="min-w-0 text-left">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p
          className={`truncate ${
            strong ? "text-lg font-black text-indigo-700" : "text-sm font-semibold text-slate-900"
          }`}
        >
          {value}
        </p>
      </div>
      <button
        onClick={copy}
        className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        {copied ? "✓ Хууллаа" : "Хуулах"}
      </button>
    </div>
  );
}

export default function PricingModal({
  open, onClose, getToken, notify, plan, planExpires, credits,
}: Props) {
  const [view, setView] = useState<"plans" | "transfer">("plans");
  const [selected, setSelected] = useState<PlanId>("business");
  const [refCode, setRefCode] = useState("");
  const [pending, setPending] = useState<PendingRequest | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const daysLeft = planExpires
    ? Math.ceil((new Date(planExpires).getTime() - Date.now()) / 86_400_000)
    : 0;
  const active = plan !== "free" && daysLeft > 0;

  // Нээгдэх үед хэрэглэгчийн код болон хүлээгдэж буй хүсэлтийг уншина
  useEffect(() => {
    if (!open) {
      setView("plans");
      return;
    }
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [prof, pend] = await Promise.all([
        supabase.from("profiles").select("ref_code").eq("id", user.id).maybeSingle(),
        supabase
          .from("payment_requests")
          .select("id,plan,amount,created_at")
          .eq("status", "pending")
          .maybeSingle(),
      ]);
      setRefCode(prof.data?.ref_code ?? "");
      setPending((pend.data as PendingRequest | null) ?? null);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const submitRequest = async () => {
    setSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        notify("warning", "Эхлээд нэвтэрнэ үү.");
        return;
      }
      const res = await fetch("/api/payments/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: selected }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Алдаа гарлаа");

      setPending({
        id: d.id,
        plan: selected,
        amount: PLAN_INFO[selected].price,
        created_at: new Date().toISOString(),
      });
      notify("success", "Хүсэлт илгээгдлээ. Төлбөр шалгагдсаны дараа таны багц идэвхжинэ.");
      setView("plans");
    } catch (e: any) {
      notify("error", e.message || "Хүсэлт илгээхэд алдаа гарлаа");
    } finally {
      setSubmitting(false);
    }
  };

  // Багц бүрийн товчны төлөв (сервер дээр мөн давхар шалгана)
  const buttonFor = (target: PlanId): { label: string; disabled: boolean } => {
    if (!active) return { label: "💳 Эрх авах", disabled: false };
    if (plan === target) {
      return daysLeft <= RENEW_WINDOW_DAYS
        ? { label: "🔄 Сунгах", disabled: false }
        : { label: `Идэвхтэй · ${daysLeft} хоног үлдсэн`, disabled: true };
    }
    if (plan === "business" && target === "enterprise") {
      return { label: "⬆️ Enterprise болгох", disabled: false };
    }
    return { label: "Enterprise идэвхтэй", disabled: true };
  };

  if (!open) return null;

  const biz = buttonFor("business");
  const ent = buttonFor("enterprise");
  const price = PLAN_INFO[selected].price;
  const alreadySent = pending?.plan === selected;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full px-2.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Хаах"
        >
          ✕
        </button>

        {view === "transfer" ? (
          /* ---------- Банкны шилжүүлгийн харагдац ---------- */
          <div className="mx-auto max-w-md space-y-4">
            <div className="text-center">
              <h3 className="text-2xl font-black text-slate-900">Банкны шилжүүлэг</h3>
              <p className="mt-1 text-sm text-slate-500">
                {PLAN_INFO[selected].name} · 30 хоног
              </p>
            </div>

            <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
              <CopyRow label="Банк" value={BANK.bankName} />
              <CopyRow label="Дансны дугаар" value={BANK.accountNumber} />
              <CopyRow label="Хүлээн авагч" value={BANK.accountHolder} />
              <CopyRow label="Шилжүүлэх дүн" value={`${money(price)}₮`} copyValue={String(price)} />
              <CopyRow
                label="Гүйлгээний утга"
                value={refCode || "Уншиж байна..."}
                copyValue={refCode}
                strong
              />
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
              ⚠️ Гүйлгээний утгад <b>{refCode || "кодоо"}</b> гэсэн кодыг заавал бичнэ үү. Үгүй бол
              таны төлбөрийг танихад удаан болно.
            </div>

            {/* Голомт / SocialPay QR (public/golomt-qr.png байвал харагдана) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BANK.qrImage}
              alt="Голомт QR"
              className="mx-auto h-44 w-44 rounded-xl border border-slate-200 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setView("plans")}
                className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                ← Буцах
              </button>
              <button
                onClick={submitRequest}
                disabled={submitting || alreadySent || !refCode}
                className="flex-[2] rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting
                  ? "Илгээж байна..."
                  : alreadySent
                  ? "✓ Хүсэлт илгээсэн (шалгагдаж байна)"
                  : pending
                  ? "Хүсэлтийг энэ багцаар шинэчлэх"
                  : "Төлбөр шилжүүлснээ мэдэгдэх"}
              </button>
            </div>
          </div>
        ) : (
          /* ---------- Үнийн багцууд ---------- */
          <>
            <div className="mb-6 text-center">
              <h3 className="text-3xl font-black tracking-tight text-slate-900">Багц сонгох</h3>
              <p className="mt-2 text-sm text-slate-500">
                Нэг шинжилгээ = 1 эрх. Хэрэгцээндээ тохирсон багцаа сонгоорой.
              </p>
            </div>

            {pending && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900">
                ⏳ Таны <b>{PLAN_INFO[pending.plan].name}</b> багцын {money(pending.amount)}₮-ийн
                төлбөр шалгагдаж байна. Баталгаажсаны дараа хуудсаа шинэчилнэ үү.
              </div>
            )}

            {active && (
              <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-center text-sm text-indigo-900">
                Таны багц: <b className="capitalize">{plan}</b> ·{" "}
                <b>{new Date(planExpires!).toLocaleDateString("mn-MN")}</b> хүртэл ({daysLeft} хоног үлдсэн)
                {plan === "business" && (
                  <>
                    {" "}· Үлдэгдэл эрх: <b>{credits ?? "…"}</b>
                  </>
                )}
              </div>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              {/* Free */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Free</p>
                <p className="mt-3 text-3xl font-black text-slate-900">0₮</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                  <li>✓ Бүртгүүлэхэд 1 эрх үнэгүй</li>
                  <li>✓ PDF болон текст шинжилгээ</li>
                  <li>✓ Түүх хадгалах</li>
                </ul>
                <div className="mt-6 rounded-xl bg-slate-200/70 py-3 text-center text-sm font-semibold text-slate-500">
                  Бүртгэлтэй үед автоматаар
                </div>
              </div>

              {/* Business */}
              <div className="relative flex flex-col rounded-2xl border-2 border-indigo-500 bg-white p-6 shadow-xl shadow-indigo-200/60">
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                  Түгээмэл
                </span>
                <p className="text-sm font-bold uppercase tracking-wider text-indigo-600">Business</p>
                <p className="mt-3 text-3xl font-black text-slate-900">
                  69,000₮ <span className="text-sm font-medium text-slate-500">/ сар</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
                  <li>✓ Сар бүр 10 тендер шинжилгээ</li>
                  <li>✓ PDF / Word тайлан татах</li>
                  <li>✓ Тендертэй чатлах</li>
                  <li>✓ Банкны шилжүүлгээр төлөх</li>
                </ul>
                <button
                  onClick={() => {
                    setSelected("business");
                    setView("transfer");
                  }}
                  disabled={biz.disabled}
                  className="mt-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-700 hover:to-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {biz.label}
                </button>
              </div>

              {/* Enterprise */}
              <div className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Enterprise</p>
                <p className="mt-3 text-3xl font-black text-slate-900">
                  169,000₮ <span className="text-sm font-medium text-slate-500">/ сар</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                  <li>✓ Хязгааргүй шинжилгээ</li>
                  <li>✓ PDF / Word тайлан татах</li>
                  <li>✓ Тендертэй чатлах</li>
                  <li>✓ Банкны шилжүүлгээр төлөх</li>
                </ul>
                <button
                  onClick={() => {
                    setSelected("enterprise");
                    setView("transfer");
                  }}
                  disabled={ent.disabled}
                  className="mt-6 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ent.label}
                </button>
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-slate-500">
              Багц нь 30 хоногийн хугацаатай. Хугацаа дуусахад ашиглаагүй эрх 0 болно. Үргэлжлүүлэхийн тулд
              дахин төлж сунгана (дуусахаас {RENEW_WINDOW_DAYS} хоногийн өмнөөс сунгах боломжтой).
            </p>
          </>
        )}
      </div>
    </div>
  );
}