import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { AnalysisResult } from "@/app/types/analysis";
import { downloadBlob } from "./download";

const levelLabel = { high: "Өндөр", medium: "Дунд", low: "Бага" } as const;

const bullets = (items: string[]) =>
  items.map((t) => new Paragraph({ text: t, bullet: { level: 0 } }));

export async function exportToDocx(r: AnalysisResult, filename = "tender-analysis") {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: r.title, heading: HeadingLevel.TITLE }),

          new Paragraph({ text: "Хураангуй", heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: r.summary, spacing: { after: 200 } }),

          new Paragraph({ text: "Шаардлагатай бичиг баримтууд", heading: HeadingLevel.HEADING_1 }),
          ...bullets(r.requiredDocuments),

          new Paragraph({ text: "Гол шалгуур үзүүлэлтүүд", heading: HeadingLevel.HEADING_1 }),
          ...bullets(r.keyRequirements),

          new Paragraph({ text: "Анхаарах эрсдэлүүд", heading: HeadingLevel.HEADING_1 }),
          ...r.risks.map(
            (x) =>
              new Paragraph({
                bullet: { level: 0 },
                children: [
                  new TextRun({ text: `[${levelLabel[x.level]}] `, bold: true }),
                  new TextRun({ text: x.text }),
                ],
              })
          ),

          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: `TenderAI MN • ${new Date().toLocaleDateString("mn-MN")}`,
                italics: true,
                color: "888888",
                size: 18,
              }),
            ],
          }),
        ],
      },
    ],
  });

  downloadBlob(await Packer.toBlob(doc), `${filename}.docx`);
}