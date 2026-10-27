"use client";
import type { AnalysisResult } from "@/app/types/analysis";

export interface HistoryItem {
  id: string;
  title: string;
  file_name: string | null;
  result: AnalysisResult;
  source_text: string | null;
  chat: { role: string; text: string }[];
  created_at: string;
}

interface Props {
  items: HistoryItem[];
  activeId: string | null;
  loading: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export default function HistoryList({ items, activeId, loading, onSelect, onDelete }: Props) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-slate-200/50">
      <h3 className="mb-4 text-lg font-bold text-slate-900">🕘 Шинжилгээний түүх</h3>

      {loading ? (
        <p className="text-sm text-slate-500">Уншиж байна...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">Одоогоор хадгалсан шинжилгээ алга.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {items.map((it) => (
            <li
              key={it.id}
              className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                it.id === activeId
                  ? "border-indigo-300 bg-indigo-50"
                  : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50"
              }`}
            >
              <button onClick={() => onSelect(it)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-semibold text-slate-900">{it.title}</p>
                <p className="text-xs text-slate-500">
                  {new Date(it.created_at).toLocaleString("mn-MN")}
                  {it.file_name ? ` • ${it.file_name}` : ""}
                </p>
              </button>
              <button
                onClick={() => {
                  if (confirm("Энэ шинжилгээг устгах уу?")) onDelete(it.id);
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                Устгах
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}