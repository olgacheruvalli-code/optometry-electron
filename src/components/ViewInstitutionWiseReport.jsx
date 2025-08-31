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
  // We use zoom (not transform) so Chrome print engine actually shrinks layout.
  const wrapRef = useRef(null);
  const [fitZoom, setFitZoom] = useState(1);

  // Base column widths (screen). We’ll compute natural content width from these.
  const TH_MIN_WIDTH = 220; // description column (wider for readability)
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
    // Reset first
    wrapRef.current.style.setProperty("--fit-zoom", "1");
    wrapRef.current.style.width = `${natWidthPx}px`;

    // Measure natural height of the full table block
    const natHeightPx = wrapRef.current.scrollHeight || 1;

    // Compute the zoom needed to fit within both width & height of A3 landscape
    const z = Math.min(1, USABLE_W_PX / natWidthPx, USABLE_H_PX / natHeightPx);
    setFitZoom(z > 0 && Number.isFinite(z) ? z : 1);
  }, [natWidthPx, questions.length, finalInstitutionNames.length, data, districtPerformance]);

  const printStyle = `
    @media print {
      @page { size: A3 landscape; margin: ${MARGIN_MM}mm; }

      /* Use zoom so layout actually shrinks for the print engine */
      .a3-onepage {
        zoom: var(--fit-zoom, 1);
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        overflow: visible !important;
        width: ${natWidthPx}px !important; /* define natural width, then zoom */
      }

      /* Tighten typography/padding for print */
      .a3-onepage * { font-size: 9pt !important; line-height: 1.15 !important; }
      .a3-onepage th, .a3-onepage td { padding: 2px 3px !important; }

      table { border-collapse: collapse !important; }
    }
  `;

  const isEmpty = !questions.length || !finalInstitutionNames.length;

  /* -------------------------------- render ------------------------------- */
  return (
    <div className="a3-onepage" style={{ ["--fit-zoom"]: fitZoom }}>
      <style>{printStyle}</style>

      <h2 className="text-lg font-bold mb-3 text-center">
        District Institution-wise Report ({month} {year})
      </h2>

      {isEmpty ? (
        <div className="text-center text-gray-600 py-12">
          No institution or question data found for this district, month, and year.
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
