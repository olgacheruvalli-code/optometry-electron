// src/components/ViewInstitutionWiseReport.jsx
import React, { useMemo, useRef, useLayoutEffect, useState } from "react";

export default function ViewInstitutionWiseReport({
  questions = [],
  institutionNames = [],
  data = [],
  districtPerformance = { monthData: [], cumulativeData: [] },
  month,
  year,
}) {
  /* ----------------------- helpers & normalization ----------------------- */
  const norm = (s) =>
    String(s || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  // Filter out DOC/DC rows from data
  const filteredData = useMemo(
    () =>
      (Array.isArray(data) ? data : []).filter((d) => {
        const name = String(d?.institution || "").trim();
        return name && !/^doc\s/i.test(name) && !/^dc\s/i.test(name);
      }),
    [data]
  );

  // Static list (dedup, no DOC/DC)
  const filteredStaticNames = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const n of Array.isArray(institutionNames) ? institutionNames : []) {
      const label = String(n || "").trim();
      if (!label || /^doc\s/i.test(label) || /^dc\s/i.test(label)) continue;
      const key = norm(label);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(label);
    }
    return out;
  }, [institutionNames]);

  // Final institution list (preserve static order, then any new from data)
  const finalInstitutionNames = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const label of filteredStaticNames) {
      const key = norm(label);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(label);
      }
    }
    for (const row of filteredData) {
      const label = String(row?.institution || "").trim();
      const key = norm(label);
      if (label && !seen.has(key)) {
        seen.add(key);
        out.push(label);
      }
    }
    return out;
  }, [filteredStaticNames, filteredData]);

  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const getValue = (instLabel, qidx, type) => {
    const key = norm(instLabel);
    const inst = filteredData.find((d) => norm(d?.institution) === key);
    if (!inst) return 0;
    const arr = type === "month" ? inst.monthData : inst.cumulativeData;
    return num(arr?.[qidx]);
  };
  const getDistrictValue = (qidx, type) => {
    const src =
      type === "month" ? districtPerformance?.monthData : districtPerformance?.cumulativeData;
    return num(src?.[qidx]);
  };

  /* ----------------------- A3 single-page print fit ---------------------- */
  const wrapRef = useRef(null);
  const [fitZoom, setFitZoom] = useState(1);

  const TH_MIN_WIDTH = 220; // description column
  const TD_MIN_WIDTH = 72;  // each Month / Cumulative cell

  const natWidthPx = Math.max(
    TH_MIN_WIDTH + finalInstitutionNames.length * TD_MIN_WIDTH * 2 + TD_MIN_WIDTH * 2,
    1000
  );

  // A3 landscape = 420mm × 297mm
  const MM_TO_PX = 96 / 25.4;
  const MARGIN_MM = 8; // small, safe margin
  const USABLE_W_PX = (420 - MARGIN_MM * 2) * MM_TO_PX;
  const USABLE_H_PX = (297 - MARGIN_MM * 2) * MM_TO_PX;

  useLayoutEffect(() => {
    if (!wrapRef.current) return;
    wrapRef.current.style.setProperty("--fit-zoom", "1");
    wrapRef.current.style.width = `${natWidthPx}px`;
    const natHeightPx = wrapRef.current.scrollHeight || 1;
    const z = Math.min(1, USABLE_W_PX / natWidthPx, USABLE_H_PX / natHeightPx);
    setFitZoom(z > 0 && Number.isFinite(z) ? z : 1);
  }, [natWidthPx, questions.length, finalInstitutionNames.length, data, districtPerformance]);

  const printStyle = `
    @media print {
      @page { size: A3 landscape; margin: ${MARGIN_MM}mm; }
      .a3-onepage {
        zoom: var(--fit-zoom, 1);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: visible !important;
        width: ${natWidthPx}px !important;
      }
      .a3-onepage * { font-size: 9pt !important; line-height: 1.15 !important; }
      .a3-onepage th, .a3-onepage td { padding: 2px 3px !important; }
      table { border-collapse: collapse !important; }
      .no-print { display: none !important; }
    }
  `;

  const isEmpty = !questions.length || !finalInstitutionNames.length;

  /* ----------------------- Excel export (from DATA) ---------------------- */
  const handleDownloadExcel = async () => {
    const XLSX = await import("xlsx");

    // Build header rows
    // Row 1: Description, <Inst1>, "", <Inst2>, "", ..., Dist. Performance, ""
    const header1 = ["Description"];
    for (const inst of finalInstitutionNames) header1.push(inst, "");
    header1.push("Dist. Performance", "");

    // Row 2: "", Month, Cumulative repeated...
    const header2 = [""];
    for (let i = 0; i < finalInstitutionNames.length; i++) header2.push("Month", "Cumulative");
    header2.push("Month", "Cumulative");

    const aoa = [header1, header2];

    // Data rows
    questions.forEach((q, qidx) => {
      const row = [q];
      finalInstitutionNames.forEach((inst) => {
        row.push(getValue(inst, qidx, "month"));
        row.push(getValue(inst, qidx, "cumulative"));
      });
      row.push(getDistrictValue(qidx, "month"));
      row.push(getDistrictValue(qidx, "cumulative"));
      aoa.push(row);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merges for top header row (merge each institution over two columns)
    const merges = [];
    // merge "Description" across first two header rows
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    // institutions
    let cStart = 1;
    for (let i = 0; i < finalInstitutionNames.length; i++) {
      merges.push({ s: { r: 0, c: cStart }, e: { r: 0, c: cStart + 1 } });
      cStart += 2;
    }
    // Dist. Performance (last two cols)
    merges.push({ s: { r: 0, c: cStart }, e: { r: 0, c: cStart + 1 } });
    ws["!merges"] = merges;

    // Auto column widths
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

    // Workbook -> Blob -> download
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
    a.download = `InstitutionWise_${month}_${year}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* -------------------------------- render ------------------------------- */
  return (
    <div className="a3-onepage" style={{ ["--fit-zoom"]: fitZoom }}>
      <style>{printStyle}</style>

      {/* Header row with Download button */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-center flex-1">
          District Institution-wise Report ({month} {year})
        </h2>
        <div className="no-print">
          <button
            type="button"
            className="px-3 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            onClick={handleDownloadExcel}
            disabled={isEmpty}
            title={isEmpty ? "Load data first" : "Download Excel"}
          >
            Download Excel
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="text-center text-gray-600 py-12">
          Select month &amp; year, then click download.
        </div>
      ) : (
        <div style={{ overflowX: "auto", width: "100%", maxWidth: "100vw" }}>
          <div ref={wrapRef} style={{ width: `${natWidthPx}px` }}>
            <table
              className="min-w-full border"
              style={{
                tableLayout: "fixed",
                width: `${natWidthPx}px`,
                borderCollapse: "collapse",
              }}
            >
              <colgroup>
                <col style={{ minWidth: TH_MIN_WIDTH }} />
                {finalInstitutionNames.map((name) => (
                  <React.Fragment key={`col-${norm(name)}`}>
                    <col style={{ minWidth: TD_MIN_WIDTH }} />
                    <col style={{ minWidth: TD_MIN_WIDTH }} />
                  </React.Fragment>
                ))}
                <col style={{ minWidth: TD_MIN_WIDTH }} />
                <col style={{ minWidth: TD_MIN_WIDTH }} />
              </colgroup>

              <thead>
                <tr>
                  <th
                    className="border px-2 py-1 bg-gray-100"
                    rowSpan={2}
                    style={{ textAlign: "left", wordBreak: "break-word", whiteSpace: "normal" }}
                  >
                    Description
                  </th>
                  {finalInstitutionNames.map((name) => (
                    <th
                      key={`h1-${norm(name)}`}
                      className="border px-2 py-1 bg-blue-100 text-center"
                      colSpan={2}
                    >
                      {name}
                    </th>
                  ))}
                  <th className="border px-2 py-1 bg-green-100 text-center" colSpan={2}>
                    Dist. Performance
                  </th>
                </tr>
                <tr>
                  {finalInstitutionNames.map((name) => (
                    <React.Fragment key={`h2-${norm(name)}`}>
                      <th className="border px-2 py-1 bg-blue-50 text-center">Month</th>
                      <th className="border px-2 py-1 bg-blue-50 text-center">Cumulative</th>
                    </React.Fragment>
                  ))}
                  <th className="border px-2 py-1 bg-green-50 text-center">Month</th>
                  <th className="border px-2 py-1 bg-green-50 text-center">Cumulative</th>
                </tr>
              </thead>

              <tbody>
                {questions.map((question, qidx) => (
                  <tr key={`row-${qidx}`}>
                    <td className="border px-2 py-1 align-top">{question}</td>
                    {finalInstitutionNames.map((name) => (
                      <React.Fragment key={`cell-${norm(name)}-${qidx}`}>
                        <td className="border px-2 py-1 text-center">
                          {getValue(name, qidx, "month")}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          {getValue(name, qidx, "cumulative")}
                        </td>
                      </React.Fragment>
                    ))}
                    <td className="border px-2 py-1 text-center">
                      {getDistrictValue(qidx, "month")}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {getDistrictValue(qidx, "cumulative")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="no-print text-xs text-gray-500 mt-2">
        Tip: In the print dialog, uncheck “Headers and footers” for a perfect one-page fit.
      </div>
    </div>
  );
}
