export async function exportToPdf(el: HTMLElement, filename = "tender-analysis") {
  const html2pdf = (await import("html2pdf.js")).default;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opt: any = {
    margin: [12, 12, 12, 12],
    filename: `${filename}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    pagebreak: { mode: ["css", "legacy"], avoid: ["li", "h2"] },
  };

  await html2pdf().set(opt).from(el).save();
}