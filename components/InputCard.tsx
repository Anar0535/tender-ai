"use client";
import { useRef, useState } from "react";

export type InputMode = "file" | "text";

interface Props {
  mode: InputMode;
  setMode: (m: InputMode) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  text: string;
  setText: (t: string) => void;
  loading: boolean;
  onSubmit: () => void;
}

const MAX_MB = 25;
const MAX_CHARS = 50000;
const MIN_CHARS = 50;

export default function InputCard({
  mode, setMode, file, setFile, text, setText, loading, onSubmit,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const pick = (f?: File | null) => {
    if (!f) return;
    if (f.type !== "application/pdf") return setErr("Зөвхөн PDF файл оруулна уу");
    if (f.size > MAX_MB * 1024 * 1024) return setErr(`Файл ${MAX_MB}MB-аас хэтэрсэн байна`);
    setErr(null);
    setFile(f);
  };

  const canSubmit =
    !loading && (mode === "file" ? !!file : text.trim().length >= MIN_CHARS);

  const size = file ? (file.size / 1024 / 1024).toFixed(1) : "";

  return (
    <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xl shadow-indigo-100/60 sm:p-8">
      {/* Tabs */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
        {([
          ["file", "📄 PDF файл"],
          ["text", "✍️ Текст оруулах"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            disabled={loading}
            onClick={() => setMode(key)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === key
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "file" ? (
        !file ? (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
              drag
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-300 bg-slate-50/60 hover:border-indigo-400 hover:bg-indigo-50/50"
            }`}
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-200 transition group-hover:scale-105">
              <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4m0 0L7 9m5-5l5 5" />
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
              </svg>
            </div>
            <p className="font-semibold text-slate-900">Файлаа энд чирж авчрах эсвэл сонгох</p>
            <p className="mt-1 text-sm text-slate-500">PDF форматтай байх (Макс: {MAX_MB}MB)</p>
          </div>
        ) : (
          <div className="flex items-center gap-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-xs font-bold text-red-600">
              PDF
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-slate-900">{file.name}</p>
              <p className="text-sm text-slate-500">{size} MB</p>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-white hover:text-red-600 disabled:opacity-50"
            >
              Устгах
            </button>
          </div>
        )
      ) : (
        <div>
          <textarea
            value={text}
            disabled={loading}
            maxLength={MAX_CHARS}
            onChange={(e) => setText(e.target.value)}
            placeholder="Тендерийн баримт бичгийн текстийг энд буулгана уу..."
            rows={10}
            className="w-full resize-y rounded-2xl border border-slate-300 bg-slate-50/60 p-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-60"
          />
          <div className="mt-1 flex justify-between text-xs text-slate-500">
            <span>{text.trim().length < MIN_CHARS ? `Хамгийн багадаа ${MIN_CHARS} тэмдэгт` : " "}</span>
            <span className="tabular-nums">{text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}</span>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-semibold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300 disabled:translate-y-0 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none"
      >
        {loading ? "Шинжилж байна..." : "🚀 Тендер шинжлэх"}
      </button>
    </div>
  );
}