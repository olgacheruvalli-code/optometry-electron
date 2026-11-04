// Builds a true A4 portrait PDF of the NPCB report, identical on every device,
// drawn as real text with thin table lines (no screenshots), then shares it
// (WhatsApp etc.) on phones or downloads it on computers.
// Libraries load on demand from cdnjs, so no npm install is needed.

const CDN = {
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
  autotable:
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js",
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = false;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

async function loadLibs() {
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript(CDN.jspdf);
  const probe = new window.jspdf.jsPDF();
  if (typeof probe.autoTable !== "function") await loadScript(CDN.autotable);
  return window.jspdf.jsPDF;
}

const PAGE_W = 210;
const PAGE_H = 297;
const M = 10; // side margin (mm)
const TOP = 12;
const BOTTOM = 14;
const FULL_W = PAGE_W - M * 2; // 190 mm
const LINE = 0.15; // table line thickness (mm) — thin like browser print
const FONT = "times";

// Standard PDF fonts can't draw some symbols; replace them
const clean = (t) =>
  String(t ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[↳└]/g, "")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=")
    .replace(/\s+/g, " ")
    .trim();

// Visible text of a node, skipping no-print bits; form fields → their value
function textOf(node) {
  if (!node) return "";
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1) return "";
  if (node.classList && (node.classList.contains("no-print") || node.classList.contains("non-print"))) return "";
  const tag = node.tagName;
  if (tag === "INPUT") {
    if (node.type === "checkbox" || node.type === "radio") return node.checked ? "Yes" : "";
    return node.value || "";
  }
  if (tag === "SELECT") return node.selectedIndex >= 0 ? node.options[node.selectedIndex].text : "";
  if (tag === "TEXTAREA") return node.value || "";
  if (tag === "BR") return " ";
  return Array.from(node.childNodes).map(textOf).join("");
}

const baseStyles = {
  font: FONT,
  fontSize: 10,
  textColor: 0,
  lineColor: 0,
  lineWidth: LINE,
  cellPadding: { top: 1.3, bottom: 1.3, left: 1.6, right: 1.6 },
  valign: "middle",
  overflow: "linebreak",
};

function drawHeader(doc, wrapper) {
  let y = TOP;
  const kids = Array.from(wrapper.children);
  const titles = kids.filter((el) => el.classList.contains("text-center"));
  titles.forEach((el, i) => {
    const size = i === 0 ? 15 : 13;
    doc.setFont(FONT, "bold");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(clean(textOf(el)), FULL_W);
    lines.forEach((ln) => {
      y += size * 0.42;
      doc.text(ln, PAGE_W / 2, y, { align: "center" });
    });
    y += i === 0 ? 1.5 : 4;
  });

  // District / Institution / Month lines: bold label + normal value
  const info = kids.find((el) => el.tagName === "DIV" && el.querySelector("p strong"));
  if (info) {
    doc.setFontSize(11.5);
    info.querySelectorAll("p").forEach((p) => {
      const strong = p.querySelector("strong");
      const label = clean(textOf(strong));
      let value = "";
      p.childNodes.forEach((n) => { if (n !== strong) value += textOf(n); });
      y += 5.6;
      doc.setFont(FONT, "bold");
      doc.text(label, M, y);
      doc.setFont(FONT, "normal");
      doc.text(clean(value), M + doc.getTextWidth(label) + 1.5, y);
    });
    y += 4;
  }
  return y;
}

const visible = (el) => {
  for (let n = el; n && n.classList; n = n.parentElement) {
    if (n.classList.contains("no-print") || n.classList.contains("non-print")) return false;
  }
  return true;
};

// One of the small inner tables (Eye Bank, Vision Center)
function drawInnerTable(doc, table, startY) {
  const rowsOf = (sec) =>
    sec ? Array.from(sec.rows).filter(visible).map((tr) => Array.from(tr.cells).map((c) => ({
      content: clean(textOf(c)),
      colSpan: c.colSpan || 1,
    }))) : [];
  const head = rowsOf(table.tHead);
  const body = [];
  Array.from(table.tBodies).forEach((tb) => body.push(...rowsOf(tb)));
  const foot = rowsOf(table.tFoot);
  const cols = Math.max(1, ...[...head, ...body].map((r) => r.reduce((a, c) => a + c.colSpan, 0)));

  doc.autoTable({
    startY,
    margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
    tableWidth: FULL_W,
    theme: "grid",
    head,
    body,
    foot,
    showHead: "everyPage",
    showFoot: "lastPage",
    styles: { ...baseStyles, fontSize: 8.5, halign: "center" },
    headStyles: { fontStyle: "bold", fillColor: 255, textColor: 0 },
    footStyles: { fontStyle: "bold", fillColor: 255, textColor: 0 },
    columnStyles: cols >= 7 ? { 0: { cellWidth: 12 }, 1: { cellWidth: 36, halign: "left" } } : { 0: { cellWidth: 30, halign: "left", fontStyle: "bold" } },
    didParseCell: (d) => {
      const txt = d.cell.raw && d.cell.raw.content;
      if (d.section === "body" && /^total$/i.test(txt || "")) d.cell.styles.fontStyle = "bold";
    },
  });
  return doc.lastAutoTable.finalY;
}

function drawMainTable(doc, table, startY) {
  const head = [[
    { content: "Description", styles: { halign: "left" } },
    { content: "During the Month", styles: { halign: "right" } },
    { content: "Cumulative", styles: { halign: "right" } },
  ]];
  let y = startY;
  let body = [];
  let first = true;

  const flush = () => {
    if (!body.length && !first) return;
    doc.autoTable({
      startY: y,
      margin: { left: M, right: M, top: TOP, bottom: BOTTOM },
      tableWidth: FULL_W,
      theme: "grid",
      head: first ? head : undefined,
      body,
      showHead: "firstPage",
      styles: baseStyles,
      headStyles: { fontStyle: "bold", fillColor: 255, textColor: 0 },
      columnStyles: {
        0: { cellWidth: FULL_W - 60 },
        1: { cellWidth: 30, halign: "right" },
        2: { cellWidth: 30, halign: "right" },
      },
    });
    y = doc.lastAutoTable.finalY;
    body = [];
    first = false;
  };

  Array.from(table.tBodies[0]?.rows || []).filter(visible).forEach((tr) => {
    const cells = Array.from(tr.cells);
    if (cells.length === 1 && cells[0].colSpan >= 3) {
      const inner = cells[0].querySelector("table");
      if (inner) {
        flush();
        y = drawInnerTable(doc, inner, y);
        return;
      }
      const bold = /font-bold/.test(cells[0].className);
      body.push([{
        content: clean(textOf(cells[0])),
        colSpan: 3,
        styles: { fontStyle: "bold", fillColor: bold ? 235 : 245 },
      }]);
      return;
    }
    const rawLabel = textOf(cells[0]);
    const sub = /^\s*[↳└]/.test(rawLabel);
    body.push([
      { content: (sub ? "- " : "") + clean(rawLabel), styles: sub ? { cellPadding: { top: 1.3, bottom: 1.3, left: 7, right: 1.6 } } : {} },
      clean(textOf(cells[1])),
      clean(textOf(cells[2])),
    ]);
  });
  flush();
  return y;
}

function drawSignatures(doc, wrapper, y) {
  const sig = Array.from(wrapper.children).find((el) => /justify-between/.test(el.className));
  if (!sig) return;
  const blocks = Array.from(sig.children);
  if (y + 22 > PAGE_H - BOTTOM) { doc.addPage(); y = TOP; }
  y += 14;
  doc.setFont(FONT, "normal");
  doc.setFontSize(11.5);
  blocks.forEach((b, i) => {
    const parts = [];
    let cur = "";
    b.childNodes.forEach((n) => {
      if (n.nodeName === "BR") { parts.push(cur); cur = ""; } else cur += textOf(n);
    });
    parts.push(cur);
    const x = i === 0 ? M : PAGE_W / 2 + 5;
    parts.map(clean).filter(Boolean).forEach((t, k) => doc.text(t, x, y + k * 7));
  });
}

export async function buildReportPdf(element, filename = "report.pdf") {
  if (!element) throw new Error("Report not found on page");
  const jsPDF = await loadLibs();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let y = drawHeader(doc, element);
  const main = Array.from(element.children).find((el) => el.tagName === "TABLE");
  if (main) y = drawMainTable(doc, main, y);
  drawSignatures(doc, element, y);

  // Footer: name, date, page numbers
  const n = doc.getNumberOfPages();
  const stamp = new Date().toLocaleDateString("en-GB");
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(90);
    doc.text(`Optometry MIS   ${stamp}`, M, PAGE_H - 6);
    doc.text(`Page ${p} of ${n}`, PAGE_W - M, PAGE_H - 6, { align: "right" });
    doc.setTextColor(0);
  }

  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}

// Share via the phone's share sheet (WhatsApp appears there); on desktop, download.
export async function shareReportPdf(element, filename, title = "Report") {
  const file = await buildReportPdf(element, filename);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return "downloaded";
}
