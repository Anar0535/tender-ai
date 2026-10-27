import { forwardRef } from "react";
import { AnalysisResult } from "@/app/types/analysis";

const color = { high: "#dc2626", medium: "#d97706", low: "#16a34a" } as const;
const label = { high: "Өндөр", medium: "Дунд", low: "Бага" } as const;

const h2 = { fontSize: 14, margin: "0 0 6px", color: "#111827" } as const;
const ul = { margin: "0 0 16px", paddingLeft: 18 } as const;

const ReportTemplate = forwardRef<HTMLDivElement, { result: AnalysisResult }>(
  ({ result }, ref) => (
    <div
      ref={ref}
      style={{
        width: "186mm",
        background: "#ffffff",
        color: "#111827",
        fontFamily: "Arial, 'Noto Sans', sans-serif",
        fontSize: "12px",
        lineHeight: 1.6,
      }}
    >
      <div style={{ borderBottom: "2px solid #4f46e5", paddingBottom: 8, marginBottom: 16 }}>
        <div style={{ color: "#4f46e5", fontWeight: 700, fontSize: 11 }}>
          TenderAI MN • Шинжилгээний тайлан
        </div>
        <h1 style={{ fontSize: 20, margin: "6px 0 0" }}>{result.title}</h1>
      </div>

      <h2 style={h2}>Хураангуй</h2>
      <p style={{ margin: "0 0 16px", whiteSpace: "pre-wrap" }}>{result.summary}</p>

      <h2 style={h2}>Шаардлагатай бичиг баримтууд</h2>
      <ul style={ul}>
        {result.requiredDocuments.map((t, i) => (
          <li key={i} style={{ marginBottom: 3 }}>{t}</li>
        ))}
      </ul>

      <h2 style={h2}>Гол шалгуур үзүүлэлтүүд</h2>
      <ul style={ul}>
        {result.keyRequirements.map((t, i) => (
          <li key={i} style={{ marginBottom: 3 }}>{t}</li>
        ))}
      </ul>

      <h2 style={h2}>Анхаарах эрсдэлүүд</h2>
      <ul style={ul}>
        {result.risks.map((r, i) => (
          <li key={i} style={{ marginBottom: 3 }}>
            <b style={{ color: color[r.level] }}>[{label[r.level]}]</b> {r.text}
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 24, fontSize: 10, color: "#9ca3af" }}>
        Үүсгэсэн огноо: {new Date().toLocaleDateString("mn-MN")}
      </div>
    </div>
  )
);
ReportTemplate.displayName = "ReportTemplate";
export default ReportTemplate;