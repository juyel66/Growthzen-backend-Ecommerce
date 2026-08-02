import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import type { ExportFormat } from "./reports.interface";

export const generateReportExportBuffer = async (
  format: ExportFormat,
  reportTitle: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): Promise<{ buffer: Buffer; contentType: string; fileName: string }> => {
  const sanitizedTitle = reportTitle.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const timestamp = new Date().toISOString().split("T")[0];

  if (format === "csv") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportTitle);
    worksheet.addRow(headers);
    rows.forEach((row) => worksheet.addRow(row));
    const csvBuffer = await workbook.csv.writeBuffer();

    return {
      buffer: Buffer.from(csvBuffer),
      contentType: "text/csv; charset=utf-8",
      fileName: `${sanitizedTitle}_${timestamp}.csv`,
    };
  }

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(reportTitle);

    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "F2F4F7" },
    };

    rows.forEach((row) => worksheet.addRow(row));

    // Auto-fit column widths
    worksheet.columns.forEach((column) => {
      let maxLen = 10;
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const valStr = cell.value ? String(cell.value) : "";
        if (valStr.length > maxLen) {
          maxLen = Math.min(valStr.length, 50);
        }
      });
      column.width = maxLen + 3;
    });

    const xlsxBuffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(xlsxBuffer),
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName: `${sanitizedTitle}_${timestamp}.xlsx`,
    };
  }

  if (format === "pdf") {
    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape" });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      // Report Header
      doc.fontSize(16).text(reportTitle.toUpperCase(), { align: "center" });
      doc.fontSize(9).text(`Generated on: ${new Date().toLocaleString()}`, { align: "center" });
      doc.moveDown(1.5);

      const tableWidth = doc.page.width - 60;
      const numCols = headers.length || 1;
      const colWidth = Math.floor(tableWidth / numCols);

      let y = doc.y;

      // Table Header Row
      doc.fontSize(9);
      headers.forEach((headerText, i) => {
        doc.text(String(headerText), 30 + i * colWidth, y, {
          width: colWidth - 4,
          lineBreak: false,
          ellipsis: true,
        });
      });

      y += 18;
      doc.moveTo(30, y).lineTo(doc.page.width - 30, y).stroke();
      y += 8;

      // Table Data Rows
      rows.forEach((row) => {
        if (y > doc.page.height - 40) {
          doc.addPage({ margin: 30, size: "A4", layout: "landscape" });
          y = 40;
        }

        row.forEach((cellValue, i) => {
          const textVal = cellValue !== null && cellValue !== undefined ? String(cellValue) : "";
          doc.text(textVal, 30 + i * colWidth, y, {
            width: colWidth - 4,
            lineBreak: false,
            ellipsis: true,
          });
        });

        y += 16;
      });

      doc.end();
    });

    return {
      buffer,
      contentType: "application/pdf",
      fileName: `${sanitizedTitle}_${timestamp}.pdf`,
    };
  }

  throw new Error(`Unsupported export format: ${format}`);
};
