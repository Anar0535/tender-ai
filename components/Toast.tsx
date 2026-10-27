"use client";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning";
export interface ToastData {
  id: number;
  type: ToastType;
  text: string;
}

const STYLES: Record<ToastType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};
const ICONS: Record<ToastType, string> = { success: "✅", error: "⚠️", warning: "⚡" };

export default function Toast({ toast, onClose }: { toast: ToastData | null; onClose: () => void }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!toast) return null;

  return (
    <div className="fixed right-4 top-24 z-[60] w-[calc(100%-2rem)] max-w-sm animate-[fadeIn_.2s_ease-out]">
      <div
        className={`flex items-start gap-3 rounded-2xl border p-4 text-sm font-medium shadow-xl ${STYLES[toast.type]}`}
      >
        <span>{ICONS[toast.type]}</span>
        <p className="flex-1 leading-snug">{toast.text}</p>
        <button onClick={onClose} className="text-xs opacity-60 hover:opacity-100">
          ✕
        </button>
      </div>
    </div>
  );
}