// src/PrintReports.jsx
import React, { useEffect, useState } from "react";
import MonthYearSelector from "./MonthYearSelector";
import ViewInstitutionWiseReport from "./ViewInstitutionWiseReport";
import ViewReportsPrintOnly from "./ViewReportsPrintOnly";

export default function PrintReports({ user }) {
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const isDOC = user?.institution?.startsWith("DOC ");

  const fetchReport = async () => {
    if (!month || !year) return;
    setLoading(true);

    try {
      if (isDOC) {
        setLoading(false);
        return;
      }
      const url = `${API_BASE}/api/reports?district=${user.district}&institution=${user.institution}&month=${month}&year=${year}`;
      const res = await fetch(url);
      const data = await res.json();
      setReport(data[0]);
    } catch (err) {
      console.error("❌ Failed to fetch report", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const getLastDate = () => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const index = monthNames.indexOf(month);
    const lastDay = new Date(parseInt(year), index + 1, 0).getDate();
    return `${lastDay}/${(index + 1).toString().padStart(2, '0')}/${year}`;
  };

  const openPrintWindow = () => {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) return;

    const content = `
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            body { font-family: 'Times New Roman'; font-size: 12pt; padding: 40px; }
            h1, h2, h3, h4, h5 { margin: 0; padding: 0; }
            .header { text-align: center; font-weight: bold; }
            .subheader { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .details { margin-left: 20px; margin-bottom: 20px; }
            .footer { display: flex; justify-content: space-between; margin-top: 100px; font-size: 12pt; }
          </style>
        </head>
        <body>
          <div class="header" style="font-size: 16pt;">
            NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
          </div>
          <div class="subheader" style="font-size: 14pt;">
            INDIVIDUAL REPORTING FORMAT
          </div>
          <div class="details">
            <div>Name of District: <b>${report.district}</b></div>
            <div>Name of PHC/CHC/TH: <b>${report.institution}</b></div>
            <div>${month} ${year}</div>
          </div>
          <div id="report-root"></div>
          <div class="footer">
            <div>Signature of Senior Optometrist / Optometrist<br/>${getLastDate()}</div>
            <div>Signature of Superintendent / Medical Officer</div>
          </div>
          <script>
            window.__REPORT__ = ${JSON.stringify(report)};
            window.__MONTH__ = "${month}";
            window.__YEAR__ = "${year}";
          </script>
          <script src="/print-bundle.js"></script>
        </body>
      </html>
    `;
    previewWindow.document.open();
    previewWindow.document.write(content);
    previewWindow.document.close();
  };

  return (
    <div
      className="a4 wrapper bg-white p-8 font-serif print:shadow-none"
      style={{ fontFamily: "Times New Roman", fontSize: "12pt" }}
    >
      <div className="mb-4 print:hidden">
        <MonthYearSelector
          month={month}
          year={year}
          setMonth={setMonth}
          setYear={setYear}
        />
      </div>

      {!month || !year ? (
        <div className="text-gray-600 text-center mt-8">
          Select month and year to view printable report
        </div>
      ) : loading ? (
        <div className="text-center text-gray-700 mt-4">Loading report…</div>
      ) : isDOC ? (
        <>
          <div
            className="text-center"
            style={{ fontSize: "16pt", fontWeight: "bold" }}
          >
            NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
          </div>
          <div
            className="text-center mb-2"
            style={{ fontSize: "14pt", fontWeight: "bold" }}
          >
            DISTRICT CONSOLIDATED REPORT FORMAT
          </div>
          <div className="text-center mb-6">
            District: <b>{user.district}</b> &nbsp; | &nbsp; Month: <b>{month}</b> &nbsp; Year: <b>{year}</b>
          </div>
          <ViewInstitutionWiseReport user={user} month={month} year={year} />
        </>
      ) : report ? (
        <div className="text-center mt-8 print:hidden">
          <button
            onClick={openPrintWindow}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 shadow-md"
          >
            Preview Report
          </button>
        </div>
      ) : (
        <div className="text-center text-red-600 mt-6">
          No report found for selected month/year.
        </div>
      )}
    </div>
  );
}
