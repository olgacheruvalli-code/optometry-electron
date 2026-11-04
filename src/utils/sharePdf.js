// Builds a true A4 portrait PDF of a report element, identical on every device
// (phone, tablet, desktop), then shares it (WhatsApp etc.) or downloads it.
// Libraries are loaded on demand from cdnjs so no npm install is needed.

const CDN = {
  html2canvas:
    "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
  jspdf: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load " + src));
    document.head.appendChild(s);
  });
}

async function loadLibs() {
  if (!window.html2canvas) await loadScript(CDN.html2canvas);
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript(CDN.jspdf);
  return { html2canvas: window.html2canvas, jsPDF: window.jspdf.jsPDF };
}

// A4 in mm, 10 mm margin on every side → 190 x 277 mm printable area
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 10;
const CONTENT_W_MM = PAGE_W - MARGIN * 2;
const CONTENT_H_MM = PAGE_H - MARGIN * 2;
const PX_PER_MM = 96 / 25.4;
const CONTENT_W_PX = Math.round(CONTENT_W_MM * PX_PER_MM); // ≈ 718 px

const CLONE_CSS = `
  .__pdf-root, .__pdf-root * { box-sizing: border-box; }
  .__pdf-root {
    width: ${CONTENT_W_PX}px !important; max-width: none !important; min-width: 0 !important;
    margin: 0 !important; padding: 16px !important; box-shadow: none !important;
    background: #fff !important; color: #000 !important;
    font-family: "Times New Roman", Times, serif !important; font-size: 12pt;
  }
  .__pdf-root .no-print, .__pdf-root .non-print { display: none !important; }
  .__pdf-root .overflow-x-auto, .__pdf-root .overflow-auto { overflow: visible !important; }
  .__pdf-root table { width: 100% !important; max-width: 100% !important; min-width: 0 !important; border-collapse: collapse !important; }
  .__pdf-root > table { table-layout: fixed !important; font-size: 10.5pt !important; }
  .__pdf-root > table > thead > tr > th:nth-child(1) { width: 66% !important; }
  .__pdf-root > table > thead > tr > th:nth-child(2),
  .__pdf-root > table > thead > tr > th:nth-child(3) { width: 17% !important; }
  .__pdf-root th, .__pdf-root td { padding: 2px 4px !important; border: 1px solid #000 !important; overflow-wrap: anywhere; word-break: break-word; }
  .__pdf-root table table { table-layout: fixed !important; font-size: 8pt !important; }
  .__pdf-root table table th, .__pdf-root table table td { padding: 1px 2px !important; font-size: 8pt !important; line-height: 1.15 !important; }
  .__pdf-root .__pdf-val { display: block; width: 100%; font-size: 8pt; min-height: 1em; }
`;

// Replace form fields with plain text so values print cleanly
function flattenInputs(src, clone) {
  const a = src.querySelectorAll("input, select, textarea");
  const b = clone.querySelectorAll("input, select, textarea");
  b.forEach((el, i) => {
    const orig = a[i];
    let v = orig ? orig.value : el.value;
    if (el.tagName === "SELECT" && orig && orig.selectedIndex >= 0) {
      v = orig.options[orig.selectedIndex]?.text ?? v;
    }
    if (el.type === "checkbox" || el.type === "radio") v = orig?.checked ? "✓" : "";
    const span = document.createElement("span");
    span.className = "__pdf-val";
    span.textContent = v ?? "";
    el.replaceWith(span);
  });
}

// Break points (px from top) so no table row is cut across pages
function pageBreaks(root, pageHpx) {
  const top0 = root.getBoundingClientRect().top;
  const rowEnds = Array.from(root.querySelectorAll(":scope > * , :scope > table > tbody > tr, :scope > table > thead > tr"))
    .map((el) => el.getBoundingClientRect().bottom - top0)
    .sort((x, y) => x - y);
  const total = root.scrollHeight;
  const breaks = [0];
  let start = 0;
  while (total - start > pageHpx) {
    let cut = start + pageHpx;
    const fit = rowEnds.filter((y) => y > start + 20 && y <= start + pageHpx);
    if (fit.length) cut = fit[fit.length - 1];
    breaks.push(cut);
    start = cut;
  }
  breaks.push(total);
  return breaks;
}

export async function buildReportPdf(element, filename = "report.pdf") {
  if (!element) throw new Error("Report not found on page");
  const { html2canvas, jsPDF } = await loadLibs();

  // Off-screen holder at exact A4 content width
  const holder = document.createElement("div");
  holder.style.cssText = `position:fixed; left:-10000px; top:0; width:${CONTENT_W_PX}px; background:#fff; z-index:-1;`;
  const style = document.createElement("style");
  style.textContent = CLONE_CSS;
  holder.appendChild(style);

  const clone = element.cloneNode(true);
  clone.classList.add("__pdf-root");
  flattenInputs(element, clone);
  holder.appendChild(clone);
  document.body.appendChild(holder);

  try {
    await new Promise((r) => setTimeout(r, 50));
    const scale = 2; // sharp text
    const canvas = await html2canvas(clone, {
      scale,
      backgroundColor: "#ffffff",
      width: CONTENT_W_PX,
      windowWidth: CONTENT_W_PX,
      useCORS: true,
    });

    const pageHpx = CONTENT_H_MM * PX_PER_MM;
    const breaks = pageBreaks(clone, pageHpx);
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    for (let i = 0; i < breaks.length - 1; i++) {
      const y0 = Math.round(breaks[i] * scale);
      const y1 = Math.min(Math.round(breaks[i + 1] * scale), canvas.height);
      const h = y1 - y0;
      if (h <= 0) continue;
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, slice.width, h);
      ctx.drawImage(canvas, 0, y0, canvas.width, h, 0, 0, canvas.width, h);
      if (i > 0) pdf.addPage();
      const hMm = (h / scale) / PX_PER_MM;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN, MARGIN, CONTENT_W_MM, hMm);
    }

    // Page numbers, like the browser print ("Page 1 of 4")
    const n = pdf.getNumberOfPages();
    const stamp = new Date().toLocaleDateString("en-GB");
    for (let p = 1; p <= n; p++) {
      pdf.setPage(p);
      pdf.setFontSize(8);
      pdf.setTextColor(90);
      pdf.text(`Optometry MIS   ${stamp}`, MARGIN, PAGE_H - 4);
      pdf.text(`Page ${p} of ${n}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
    }

    const blob = pdf.output("blob");
    return new File([blob], filename, { type: "application/pdf" });
  } finally {
    holder.remove();
  }
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
