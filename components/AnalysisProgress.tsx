"use client";
import { useEffect, useState } from "react";

const STEPS = [
  "Файлыг байршуулж байна",
  "Хуудсуудаас текст задалж байна",
  "Шаардлага, нөхцөлүүдийг тодорхойлж байна",
  "Эрсдэлүүдийг үнэлж байна",
  "Тайланг бэлтгэж байна",
];

export function useAnalysisProgress(loading: boolean) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (loading) {
      setProgress(3);
      const id = setInterval(() => {
        setProgress((p) => p + (92 - p) * 0.03);
      }, 400);
      return () => clearInterval(id);
    }
    setProgress((p) => (p > 0 ? 100 : 0));
  }, [loading]);

  const step = Math.min(STEPS.length - 1, Math.floor(progress / (100 / STEPS.length)));
  return { progress, step };
}

export default function AnalysisProgress({ progress, step }: { progress: number; step: number }) {
  return (
    <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <svg className="h-5 w-5 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
        <p className="font-medium text-gray-900">{STEPS[step]}...</p>
        <span className="ml-auto text-sm tabular-nums text-gray-500">{Math.round(progress)}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="mt-5 space-y-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-sm">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                i < step
                  ? "bg-indigo-600 text-white"
                  : i === step
                  ? "animate-pulse bg-indigo-100 text-indigo-700"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span className={i <= step ? "text-gray-900" : "text-gray-400"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}