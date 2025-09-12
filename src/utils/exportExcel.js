// src/utils/exportExcel.js
// Convert any <table id="..."> to a .xlsx and download it.
export async function exportTableToXLSX(tableId, filename = "institution-wise.xlsx") {
  // dynamic import so it only runs in the browser
  const XLSX = await import("xlsx");

  const el = document.getElementById(tableId);
  if (!el) {
    console.error("exportTableToXLSX: table not found:", tableId);
    alert("Could not find the table on this page.");
    return;
  }

  // Convert the table to a worksheet
  const ws = XLSX.utils.table_to_sheet(el, { raw: true });

  // Auto-size columns (best-effort)
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
  const cols = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let max = 10;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const cell = ws[XLSX.utils.encode_cell({ r: R, c: C })];
      if (!cell) continue;
      const v = String(cell.v ?? "");
      if (v.length > max) max = v.length;
    }
    cols.push({ wch: Math.min(max + 2, 60) });
  }
  ws["!cols"] = cols;

  // Build workbook and trigger download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Institution-wise");
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });

  const blob = new Blob(
    [wbout],
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
