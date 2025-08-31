import React from "react";

export default function PrintPreview({ report, month, year, ViewReportsComponent }) {
  if (!report) return null;

  const getLastDate = () => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const index = monthNames.indexOf(month);
    const lastDay = new Date(parseInt(year), index + 1, 0).getDate();
    return `${lastDay}/${(index + 1).toString().padStart(2, '0')}/${year}`;
  };

  return (
    <div className="a4-wrapper bg-white p-8 font-serif" style={{ fontFamily: 'Times New Roman', fontSize: '12pt' }}>
      <div className="text-center" style={{ fontSize: '16pt', fontWeight: 'bold' }}>
        NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
      </div>
      <div className="text-center mb-2" style={{ fontSize: '14pt', fontWeight: 'bold' }}>
        INDIVIDUAL REPORTING FORMAT
      </div>

      <div className="text-left mb-6 pl-8">
        <div>Name of District: <b>{report.district}</b></div>
        <div className="mt-1">Name of PHC/CHC/TH: <b>{report.institution}</b></div>
        <div className="mt-1">{month} {year}</div>
      </div>

      <ViewReportsComponent
        reportData={report}
        month={month}
        year={year}
      />

      <div className="flex justify-between text-sm pt-8 mt-12 print:mt-20">
        <div className="text-left">
          Signature of Senior Optometrist / Optometrist<br />
          <span className="inline-block mt-1">{getLastDate()}</span>
        </div>
        <div className="text-right">
          Signature of Superintendent / Medical Officer
        </div>
      </div>
    </div>
  );
}
