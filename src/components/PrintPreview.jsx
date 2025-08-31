import React from "react";
import ViewReportsPrintOnly from "./ViewReportsPrintOnly";

export default function PrintPreview({ report, month, year }) {
  const saved = localStorage.getItem("print_report");
  const fullReport = report || window.__REPORT__ || (saved && JSON.parse(saved));
  const finalMonth = month || window.__MONTH__ || fullReport?.month;
  const finalYear = year || window.__YEAR__ || fullReport?.year;

  const finalReport = {
    answers: fullReport?.answers || {},
    cumulative: fullReport?.cumulative || {},
    eyeBank: fullReport?.eyeBank || [],
    visionCenter: fullReport?.visionCenter || [],
    district: fullReport?.district || "",
    institution: fullReport?.institution || "",
  };

  function lastDayOfMonth(month, year) {
    const MONTH_INDEX = {
      April: 3, May: 4, June: 5, July: 6, August: 7,
      September: 8, October: 9, November: 10,
      December: 11, January: 0, February: 1, March: 2,
    };
    const m = MONTH_INDEX[month];
    const y = parseInt(year) + (m < 3 ? 1 : 0);
    return new Date(y, m + 1, 0).toLocaleDateString("en-GB");
  }

  if (!fullReport || !finalMonth || !finalYear) {
    return (
      <div className="text-center mt-10 text-gray-600 text-lg">
        ❌ Missing data for print preview. Please return and select a report.
      </div>
    );
  }

  // Determine layout class: A4 portrait for individual, legal landscape for district
  const isDistrictReport = finalReport.institution === "" && finalReport.visionCenter.length > 0;
  const wrapperClass = isDistrictReport
    ? "print-preview-clean legal-landscape"
    : "print-preview-clean a4-wrapper";

  return (
    <div className={`${wrapperClass} text-[12pt] font-serif`}>
      <div className="text-center font-bold text-[16pt] mb-1">
        NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
      </div>
      <div className="text-center font-semibold text-[14pt] mb-4">
        INDIVIDUAL REPORTING FORMAT
      </div>

      <div className="print-body mb-4 leading-relaxed">
        <p><strong>District:</strong> {finalReport.district}</p>
        {finalReport.institution && (
          <p><strong>Institution:</strong> {finalReport.institution}</p>
        )}
        <p><strong>Month:</strong> {finalMonth} {finalYear}</p>
      </div>

      <ViewReportsPrintOnly
        reportData={finalReport}
        month={finalMonth}
        year={finalYear}
      />

      <div className="flex justify-between mt-8">
        <div>
          Signature of Senior Optometrist / Optometrist
          <br />
          {lastDayOfMonth(finalMonth, finalYear)}
        </div>
        <div>
          Signature of Superintendent / Medical Officer
        </div>
      </div>
    </div>
  );
}
