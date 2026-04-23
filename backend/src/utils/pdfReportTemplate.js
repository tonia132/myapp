// backend/src/utils/pdfReportTemplate.js
import PDFDocument from "pdfkit";
import fs from "fs";

/**
 * ✅ 生成標準測試報告 PDF
 * @param {string} outputPath - 輸出路徑
 * @param {object} data - 報告資料
 * @param {string} [logoPath] - Logo 圖檔路徑 (PNG/JPG)
 */
export function generateTestReportPDF(outputPath, data, logoPath = null) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  try {
    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // 📘 封面
    if (logoPath && fs.existsSync(logoPath)) {
      doc.image(logoPath, (doc.page.width - 120) / 2, 60, { width: 120 });
      doc.moveDown(6);
    } else {
      doc.moveDown(10);
    }

    doc.fontSize(24).text(data.productName || "Product Report", { align: "center" });
    doc.moveDown(2).fontSize(20).text("Test Report", { align: "center" });
    doc.addPage();

    // 📊 Summary Table
    doc.fontSize(18).text("Summary of Test", { align: "center" });
    doc.moveDown(2);

    const summaryHeaders = ["Category", "Total", "Pass", "Fail", "Untested"];
    const colWidths = [220, 80, 60, 60, 80];
    let y = doc.y;

    // Header
    let x = doc.x;
    summaryHeaders.forEach((h, i) => {
      doc.rect(x, y, colWidths[i], 25).stroke();
      doc.fontSize(12).text(h, x + 5, y + 7);
      x += colWidths[i];
    });
    y += 25;

    // Rows
    data.summary?.forEach((row) => {
      x = doc.x;
      const vals = [row.category, row.total, row.pass, row.fail, row.untested];
      vals.forEach((v, i) => {
        doc.rect(x, y, colWidths[i], 20).stroke();
        doc.fontSize(11).text(v?.toString() ?? "-", x + 5, y + 5);
        x += colWidths[i];
      });
      y += 20;
    });

    doc.addPage();

    // 📋 Test Case Table
    doc.fontSize(16).text("Test Case Details", { underline: true });
    doc.moveDown(1);

    const headers = ["Test Case", "Procedure", "Criteria", "Hrs.", "Result"];
    const widths = [120, 140, 140, 50, 60];
    y = doc.y;
    x = doc.x;

    headers.forEach((h, i) => {
      doc.rect(x, y, widths[i], 25).stroke();
      doc.fontSize(12).text(h, x + 5, y + 7);
      x += widths[i];
    });
    y += 25;

    data.testCases?.forEach((t) => {
      x = doc.x;
      const vals = [t.testCase, t.procedure, t.criteria, t.hrs?.toString() || "", t.result || ""];
      vals.forEach((v, i) => {
        doc.rect(x, y, widths[i], 40).stroke();
        doc.fontSize(10).text(v, x + 5, y + 5, { width: widths[i] - 10 });
        x += widths[i];
      });
      y += 40;
    });

    // 📝 簽核區
    doc.addPage();
    doc.fontSize(18).text("簽核區", { align: "center", underline: true });
    doc.moveDown(2);

    const sx = 100,
      sy = 200,
      cw = 150,
      rh = 60;
    doc.lineWidth(1.5);
    ["審核人員", "職稱", "日期"].forEach((txt, i) => {
      doc.rect(sx + cw * i, sy, cw, rh).stroke();
      doc.text(txt, sx + cw * i + 10, sy + 20);
    });

    doc.end();
    stream.on("finish", () => console.log(`✅ PDF 生成完成：${outputPath}`));
  } catch (err) {
    console.error("❌ 生成 PDF 失敗:", err);
    doc.end();
  }
}
