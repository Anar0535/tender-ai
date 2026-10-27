"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import AnalysisProgress, { useAnalysisProgress } from "@/components/AnalysisProgress";
import ReportTemplate from "@/components/ReportTemplate";
import InputCard, { InputMode } from "@/components/InputCard";
import HistoryList, { HistoryItem } from "@/components/HistoryList";
import PricingModal, { PaidInfo } from "@/components/PricingModal";
import Toast, { ToastData, ToastType } from "@/components/Toast";
import { exportToDocx } from "@/lib/exportDocx";
import { exportToPdf } from "@/lib/exportPdf";
import type { AnalysisResult, Risk, RiskLevel } from "@/app/types/analysis";

const LEVELS: RiskLevel[] = ["high", "medium", "low"];

const normalizeRisk = (r: any): Risk => {
  if (typeof r === "string") return { level: "medium", text: r };
  return {
    level: LEVELS.includes(r?.level) ? r.level : "medium",
    text: r?.text ?? r?.description ?? "",
  };
};

const HISTORY_COLUMNS = "id,title,file_name,result,source_text,chat,created_at";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  // Оруулах хэсэг
  const [mode, setMode] = useState<InputMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);

  // Chat
  const [question, setQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Түүх
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  // Эрх, төлбөр, мэдэгдэл
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<"free" | "business" | "enterprise">("free");
  const [planExpires, setPlanExpires] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);

  const notify = (type: ToastType, text: string) => setToast({ id: Date.now(), type, text });

  const getAccessToken = async () =>
    (await supabase.auth.getSession()).data.session?.access_token ?? null;

  const reportRef = useRef<HTMLDivElement>(null);
  const { progress, step } = useAnalysisProgress(loading);

  const loadCredits = async (_uid: string) => {
    const { data, error } = await supabase.rpc("get_my_profile");
    if (error) {
      console.error("Эрх уншихад алдаа:", error.message);
      return;
    }
    const p = Array.isArray(data) ? data[0] : data;
    if (p) {
      setCredits(p.credits);
      setPlan(p.plan);
      setPlanExpires(p.plan_expires_at);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select(HISTORY_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) console.error("Түүх уншихад алдаа:", error.message);
    else if (data) setHistory(data as HistoryItem[]);
    setHistoryLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadHistory();
      loadCredits(user.id);
    } else {
      setHistory([]);
      setCurrentId(null);
      setCredits(null);
      setPlan("free");
      setPlanExpires(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleAnalyze() {
    if (mode === "file" && !file) return;
    if (mode === "text" && text.trim().length < 50) return;

    if (!user) {
      notify("warning", "Шинжилгээ хийхийн тулд эхлээд нэвтэрнэ үү.");
      router.push("/login");
      return;
    }
    if (plan !== "enterprise" && credits !== null && credits <= 0) {
      notify("warning", "Үнэгүй эрх дууссан байна. Эрхээ цэнэглэнэ үү.");
      setShowPricing(true);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSourceText(null);
    setChatHistory([]);
    setCurrentId(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        router.push("/login");
        return;
      }

      const fd = new FormData();
      if (mode === "file") fd.append("file", file!);
      else fd.append("text", text);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (res.status === 403) {
        loadCredits(user.id);
        notify("warning", data.error || "Үнэгүй эрх дууссан байна. Эрхээ цэнэглэнэ үү.");
        setShowPricing(true);
        return;
      }
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error(data.error || "Шинжилгээ амжилтгүй боллоо");

      if (data.unlimited) {
        notify("success", "Шинжилгээ амжилттай.");
      } else if (typeof data.credits === "number") {
        setCredits(data.credits);
        notify(
          data.credits === 0 ? "warning" : "success",
          data.credits === 0
            ? "Шинжилгээ амжилттай. Таны эрх дууслаа, үргэлжлүүлэхийн тулд цэнэглэнэ үү."
            : `Шинжилгээ амжилттай. Үлдэгдэл эрх: ${data.credits}`
        );
      }

      const d = data.data;
      const analysis: AnalysisResult = {
        title: d.tender_title || d.title || "Тендерийн тайлан",
        summary: d.summary || "",
        requiredDocuments: d.required_documents || d.requiredDocuments || [],
        keyRequirements: d.key_requirements || d.keyRequirements || [],
        risks: (d.potential_risks || d.risks || []).map(normalizeRisk),
      };
      setResult(analysis);
      if (mode === "text") setSourceText(text);

      // Түүхэнд хадгалах
      const insertRes = await supabase
        .from("analyses")
        .insert({
          title: analysis.title,
          file_name: mode === "file" ? file?.name ?? null : null,
          result: analysis,
          source_text: mode === "text" ? text : null,
        })
        .select(HISTORY_COLUMNS)
        .single();

      const saved = insertRes.data as HistoryItem | null;
      const saveErr = insertRes.error as { message: string } | null;

      if (saveErr) {
        console.error("Түүх хадгалахад алдаа:", saveErr.message);
      } else if (saved) {
        setCurrentId(saved.id);
        setHistory((prev) => [saved, ...prev]);
      }
    } catch (e: any) {
      setError(e.message || "Тодорхойгүй алдаа гарлаа");
      // Алдаа гарвал сервер эрхийг буцаасан тул үлдэгдлийг дахин уншина
      if (user) loadCredits(user.id);
    } finally {
      setLoading(false);
    }
  }

  const handlePaid = (p: PaidInfo) => {
    setCredits(p.credits);
    setPlan(p.plan);
    setPlanExpires(p.expiresAt);
    setShowPricing(false);
    notify(
      "success",
      p.plan === "enterprise"
        ? "Төлбөр амжилттай! Enterprise багц идэвхжлээ. Хязгааргүй шинжилгээ хийх боломжтой."
        : `Төлбөр амжилттай! Business багц идэвхжлээ. Үлдэгдэл эрх: ${p.credits}`
    );
  };

  const handleSelectHistory = (it: HistoryItem) => {
    setResult(it.result);
    setSourceText(it.source_text);
    setChatHistory(it.chat ?? []);
    setCurrentId(it.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteHistory = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) {
      setError("Устгахад алдаа гарлаа: " + error.message);
      return;
    }
    setHistory((prev) => prev.filter((h) => h.id !== id));
    if (id === currentId) {
      setCurrentId(null);
      setResult(null);
      setSourceText(null);
      setChatHistory([]);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !result) return;

    const userQuestion = question;
    const historyBefore = chatHistory;
    setQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: userQuestion }]);
    setChatLoading(true);

    try {
      const analysisSummary = `
Тендерийн нэр: ${result.title}
Товч хураангуй: ${result.summary}
Бүрдүүлэх бичиг баримтууд: ${JSON.stringify(result.requiredDocuments)}
Гол шалгуур үзүүлэлтүүд: ${JSON.stringify(result.keyRequirements)}
Эрсдэлүүд: ${JSON.stringify(result.risks)}
      `;
      const tenderText = sourceText ? `${analysisSummary}\n\nБүтэн текст:\n${sourceText}` : analysisSummary;

      const token = await getAccessToken();
      if (!token) {
        notify("warning", "Асуулт асуухын тулд эхлээд нэвтэрнэ үү.");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: userQuestion, tenderText }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Асуултад хариулахад алдаа гарлаа");

      const newChat = [
        ...historyBefore,
        { role: "user", text: userQuestion },
        { role: "ai", text: data.answer },
      ];
      setChatHistory(newChat);

      if (currentId) {
        const { error: upErr } = await supabase
          .from("analyses")
          .update({ chat: newChat })
          .eq("id", currentId);
        if (upErr) console.error("Чат хадгалахад алдаа:", upErr.message);
        else setHistory((prev) => prev.map((h) => (h.id === currentId ? { ...h, chat: newChat } : h)));
      }
    } catch (err: any) {
      setChatHistory((prev) => [...prev, { role: "ai", text: "Алдаа гарлаа: " + err.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  async function handleExport(type: "pdf" | "docx") {
    if (!result) return;
    setExporting(type);
    try {
      const name = `tenderai-${Date.now()}`;
      if (type === "pdf" && reportRef.current) await exportToPdf(reportRef.current, name);
      if (type === "docx") await exportToDocx(result, name);
    } catch (e: any) {
      setError("Татахад алдаа гарлаа: " + (e?.message ?? ""));
    } finally {
      setExporting(null);
    }
  }

  const noCredits = plan !== "enterprise" && credits !== null && credits <= 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-slate-50 text-slate-800 antialiased selection:bg-indigo-600 selection:text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-indigo-200/40 blur-3xl" />
      <div className="pointer-events-none absolute top-60 -right-24 h-72 w-72 rounded-full bg-violet-200/40 blur-3xl" />

      <Toast toast={toast} onClose={() => setToast(null)} />
<PricingModal
        open={showPricing}
        onClose={() => setShowPricing(false)}
        user={user} // <-- Энд user хувьсагчаа холбож өгнө
        getToken={getAccessToken}
        onPaid={handlePaid}
        notify={notify}
        plan={plan}
        planExpires={planExpires}
        credits={credits}
      />

      <div className="relative">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-indigo-500/20">
                AI
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900">
                  TenderAI <span className="text-indigo-600">MN</span>
                </h1>
                <p className="text-xs text-slate-500 font-medium">Enterprise Procurement Intelligence</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <button
                  onClick={() => setShowPricing(true)}
                  className={`flex items-center gap-2 rounded-full border py-1.5 pl-3.5 pr-1.5 text-xs font-semibold transition ${
                    noCredits
                      ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                      : "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100"
                  }`}
                >
                  <span>
                    ⚡{" "}
                    {plan === "enterprise" ? (
                      <b>Хязгааргүй</b>
                    ) : (
                      <>
                        Үлдэгдэл эрх: <b className="tabular-nums">{credits ?? "…"}</b>
                      </>
                    )}
                  </span>
                  <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    {plan === "free" ? "Эрх авах" : "Сунгах"}
                  </span>
                </button>
              )}

              {user ? (
                <div className="flex items-center gap-3 bg-slate-100/80 border border-slate-200/60 p-1.5 pl-4 rounded-full">
                  <span className="hidden text-xs font-semibold text-slate-700 sm:inline">{user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-xs font-medium bg-white text-rose-600 px-3.5 py-2 rounded-full hover:bg-rose-50 transition border border-rose-100"
                  >
                    Гарах
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push("/login")}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  Нэвтрэх / Бүртгүүлэх
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold tracking-wide uppercase">
              ✨ AI-Powered Analysis
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Тендерийн баримт бичгийн{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                ухаалаг задлан шинжилгээ
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-600">
              Тендерийн PDF файлаа оруулаад хууль эрх зүйн эрсдэл, бичиг баримт, шаардлагуудыг секундын дотор тодорхойл.
            </p>
          </div>

          <InputCard
            mode={mode}
            setMode={setMode}
            file={file}
            setFile={setFile}
            text={text}
            setText={setText}
            loading={loading}
            onSubmit={handleAnalyze}
          />

          {!user && (
            <p className="text-center text-sm text-slate-500">
              💡 Шинжилгээ хийх болон түүх хадгалахын тулд{" "}
              <button onClick={() => router.push("/login")} className="font-semibold text-indigo-600 hover:underline">
                нэвтэрнэ үү
              </button>
              . Бүртгүүлэхэд 1 шинжилгээ үнэгүй.
            </p>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <AnalysisProgress progress={progress} step={step} />
            </div>
          )}

          {error && (
            <div className="bg-rose-50 text-rose-700 p-5 rounded-2xl border border-rose-200 text-sm font-medium shadow-sm">
              ⚠️ {error}
            </div>
          )}

          {user && (
            <HistoryList
              items={history}
              activeId={currentId}
              loading={historyLoading}
              onSelect={handleSelectHistory}
              onDelete={handleDeleteHistory}
            />
          )}

          {result && (
            <div className="space-y-6">
              <section className="relative w-full rounded-3xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-200/50 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <h2 className="text-2xl font-black text-slate-900">{result.title}</h2>
                  <div className="flex gap-2.5 print:hidden">
                    <button
                      onClick={() => handleExport("pdf")}
                      disabled={!!exporting}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      {exporting === "pdf" ? "Бэлтгэж байна..." : "📥 PDF татах"}
                    </button>
                    <button
                      onClick={() => handleExport("docx")}
                      disabled={!!exporting}
                      className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 transition shadow-md shadow-indigo-600/20"
                    >
                      {exporting === "docx" ? "Бэлтгэж байна..." : "📥 Word татах"}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2">📋 Хураангуй</h3>
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-wrap bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    {result.summary}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-sky-50/60 p-6 rounded-2xl border border-sky-100">
                    <h3 className="font-bold text-sky-900 mb-3 text-sm flex items-center gap-2">
                      <span>📑</span> Шаардлагатай бичиг баримтууд
                    </h3>
                    <ul className="space-y-2 text-sky-950 text-xs md:text-sm">
                      {result.requiredDocuments.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-sky-100/50">
                          <span className="text-sky-600 font-bold">•</span>
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-100">
                    <h3 className="font-bold text-rose-900 mb-3 text-sm flex items-center gap-2">
                      <span>⚠️</span> Эрсдэлүүд
                    </h3>
                    <ul className="space-y-2.5 text-xs md:text-sm text-rose-950">
                      {result.risks.map((r, i) => (
                        <li key={i} className="flex items-start gap-2.5 bg-white/80 p-2.5 rounded-xl border border-rose-100/50">
                          <span
                            className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider mt-0.5 text-white ${
                              r.level === "high"
                                ? "bg-rose-600"
                                : r.level === "medium"
                                ? "bg-amber-500"
                                : "bg-emerald-600"
                            }`}
                          >
                            {r.level === "high" ? "Өндөр" : r.level === "medium" ? "Дунд" : "Бага"}
                          </span>
                          <span className="leading-snug">{r.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {result.keyRequirements.length > 0 && (
                  <div className="bg-violet-50/60 p-6 rounded-2xl border border-violet-100">
                    <h3 className="font-bold text-violet-900 mb-3 text-sm flex items-center gap-2">
                      <span>🎯</span> Гол шалгуур үзүүлэлтүүд
                    </h3>
                    <ul className="grid gap-2 md:grid-cols-2 text-xs md:text-sm text-violet-950">
                      {result.keyRequirements.map((k, i) => (
                        <li key={i} className="flex items-start gap-2 bg-white/80 p-2 rounded-xl border border-violet-100/50">
                          <span className="text-violet-600 font-bold">•</span>
                          <span>{k}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div style={{ position: "absolute", left: "-10000px", top: 0 }} aria-hidden>
                  <ReportTemplate ref={reportRef} result={result} />
                </div>
              </section>

              {/* Chat */}
              <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-6 print:hidden">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">💬 Тендертэй чатлах</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Энэхүү тендерийн талаар хүссэн асуултаа хиймэл оюун ухаанаас асуугаарай.
                  </p>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {chatHistory.map((chat, index) => (
                    <div key={index} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                          chat.role === "user"
                            ? "bg-indigo-600 text-white rounded-br-sm shadow-md shadow-indigo-600/20"
                            : "bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200/60"
                        }`}
                      >
                        {chat.text}
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-500 p-4 rounded-2xl rounded-bl-sm text-xs font-medium animate-pulse">
                        AI хариу бичиж байна...
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleAskQuestion} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    maxLength={1000}
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Жишээ нь: Баталгаа гаргах хугацаа хэд хоног вэ?"
                    className="flex-1 border border-slate-300 rounded-2xl px-5 py-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !question.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3.5 rounded-2xl disabled:opacity-40 transition shadow-lg shadow-indigo-600/20 text-sm"
                  >
                    Асуух
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}