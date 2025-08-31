import React from "react";
import ViewInstitutionWiseReport from "./ViewInstitutionWiseReport";

export default function DistrictInstitutionReports({ user }) {
  return (
    <div className="font-serif px-4 py-6">
      <h2 className="text-2xl font-bold text-center text-[#134074] mb-4">
        Institution-wise District Report
      </h2>
      <ViewInstitutionWiseReport user={user} />
    </div>
  );
}
