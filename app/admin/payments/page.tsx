"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Status = "pending" | "approved" | "rejected";

interface Row {
  id: string;
  plan: "business" | "enterprise";
  amount: number;
  status: Status;
  created_at: string;
  reviewed_at: string | null;
  profiles: { email: string | null; full_name: string | null; ref_code: string | null } | null;
}

const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "Хүлээгдэж буй" },
  { key: "approved", label: "Баталгаажсан" },
  { key: "rejected", label: "Татгалзсан" },
];

const PLAN_LABEL = { business: "Business", enterprise: "Enterprise" } as const;
const money = (n: number) => Number(n).toLocaleString("en-US");

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Status>("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const authHeaders = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : null;
  };

  const load = useCallback(async (status: Status) => {
    setLoading(true);
    setError(null);
    const headers = await authHeaders();
    if (!headers) {
      setError("Эхлээд нэвтэрнэ үү.");
      setRows([]);
      setLoading(false);
      return;
    }
    const res = await fetch(`/api/admin/payments?status=${status}`, { headers });
    const d = await res.json();
    if (!res.ok) {
      setError(d.error || "Алдаа гарлаа");
      setRows([]);
    } else {
      setRows(d.rows ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  const act = async (row: Row, action: "approve" | "reject") => {
    const who = row.profiles?.email ?? "хэрэглэгч";
    const question =
      action === "approve"
        ? `${who}: ${money(row.amount)}₮ ${row.profiles?.ref_code ?? ""} кодтой гүйлгээ банкны хуулгад орсныг шалгасан уу?\n\n${PLAN_LABEL[row.plan]} багцыг идэвхжүүлэх үү?`
        : `${who}-ийн хүсэлтээс татгалзах уу?`;
    if (!confirm(question)) return;

    setBusyId(row.id);
    setError(null);
    setInfo(null);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error("Эхлээд нэвтэрнэ үү.");

      const res = await fetch("/api/admin/approve-payment", {
        method: "POST",
        headers,
        body: JSON.stringify({ requestId: row.id, action }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Алдаа гарлаа");

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setInfo(
        action === "approve"
          ? `✅ ${who}: ${PLAN_LABEL[row.plan]} багц идэвхжлээ.`
          : `${who}-ийн хүсэлтээс татгалзлаа.`
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Төлбөрийн хүсэлтүүд</h1>
            <p className="text-xs text-slate-500">
              Банкны хуулгаас гүйлгээний утга (код) болон дүнг тулгаж баталгаажуулна.
            </p>
          </div>
          <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
            ← Нүүр хуудас
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-lg py-2 text-sm font-semibold transition ${
                tab === t.key ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            ⚠️ {error}
          </div>
        )}
        {info && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            {info}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Уншиж байна...</p>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Хүсэлт алга.
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {r.profiles?.email ?? "—"}
                    {r.profiles?.full_name ? (
                      <span className="font-medium text-slate-500"> · {r.profiles.full_name}</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-500">
                    Код: <b className="font-mono text-indigo-700">{r.profiles?.ref_code ?? "—"}</b> ·{" "}
                    {new Date(r.created_at).toLocaleString("mn-MN")}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {PLAN_LABEL[r.plan]} · {money(r.amount)}₮
                  </p>
                </div>

                {r.status === "pending" ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(r, "reject")}
                      disabled={busyId === r.id}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Татгалзах
                    </button>
                    <button
                      onClick={() => act(r, "approve")}
                      disabled={busyId === r.id}
                      className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === r.id ? "..." : "✓ Approve"}
                    </button>
                  </div>
                ) : (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                    }`}
                  >
                    {r.status === "approved" ? "Баталгаажсан" : "Татгалзсан"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}