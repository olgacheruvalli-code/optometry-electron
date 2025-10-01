/* ===========================================================================
   ViewReports (uses backend FY endpoint; Apr->selected; EB/VC no cumulative)
   =========================================================================== */
function ViewReports({ reportData, month, year }) {
  const [doc, setDoc] = useState(reportData);
  const [hydrating, setHydrating] = useState(false);
  const [cumTotals, setCumTotals] = useState({});
  const [cumFallback, setCumFallback] = useState(null); // local FY fallback
  const flatRows = useMemo(() => buildFlatRows(sections), []);

  const id = reportData?._id || reportData?.id;

  const baseDistrict = reportData?.district || "";
  const baseInstitution = reportData?.institution || "";

  // Hydrate the selected document (so month column shows full data)
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        setHydrating(true);
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled && res.ok && data && typeof data === "object" && (data.doc || data).answers) {
          setDoc(data.doc || data);
        } else {
          // Fallback: query by MY
          const q =
            `district=${encodeURIComponent(reportData?.district || "")}` +
            `&institution=${encodeURIComponent(reportData?.institution || "")}` +
            `&month=${encodeURIComponent(reportData?.month || "")}` +
            `&year=${encodeURIComponent(reportData?.year || "")}`;
          const r2 = await fetch(`${API_BASE}/api/reports?${q}`);
          const j2 = await r2.json().catch(() => ({}));
          const arr = Array.isArray(j2?.docs) ? j2.docs : Array.isArray(j2) ? j2 : [];
          const latest = arr.sort((a,b) =>
            new Date(b?.updatedAt||b?.createdAt||0) - new Date(a?.updatedAt||a?.createdAt||0)
          )[0];
          if (!cancelled && latest) setDoc(latest);
        }
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, reportData?.district, reportData?.institution, reportData?.month, reportData?.year]);

  // Authoritative FY totals from backend (Apr->selected, inclusive)
  useEffect(() => {
    setCumTotals({});
    if (!baseDistrict || !baseInstitution || !month || !year) return;
    let cancelled = false;
    (async () => {
      try {
        const qs = new URLSearchParams({
          district: baseDistrict,
          institution: baseInstitution,
          month,
          year: String(year),
        }).toString();
        const r = await fetch(`${API_BASE}/api/institution-fy-cumulative?${qs}`);
        const j = await r.json().catch(() => ({}));
        if (!cancelled && r.ok && j?.ok && j?.cumulative) {
          setCumTotals(j.cumulative);
        }
      } catch (e) {
        console.warn("FY cumulative fetch failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, [baseDistrict, baseInstitution, month, year]);

  // Local FY fallback (latest per month, Apr->selected) only if server didn't provide totals
  useEffect(() => {
    if (cumTotals && Object.keys(cumTotals).length) { setCumFallback(null); return; }
    if (!baseDistrict || !baseInstitution || !month || !year) { setCumFallback(null); return; }

    let cancelled = false;
    (async () => {
      try {
        // all reports for this institution
        const qs = new URLSearchParams({ district: baseDistrict, institution: baseInstitution }).toString();
        const r = await fetch(`${API_BASE}/api/reports?${qs}`);
        const j = await r.json().catch(() => ({}));
        const all = Array.isArray(j?.docs) ? j.docs : Array.isArray(j) ? j : [];
        if (cancelled) return;

        // FY window Apr->selected
        const monthIdx = Object.fromEntries(MONTHS.map((m, i) => [m.toLowerCase(), i]));
        const selIdx = monthIdx[String(month).toLowerCase()];
        if (selIdx == null || selIdx < 0) { setCumFallback(null); return; }
        const fiscalStartYear = selIdx >= 9 ? Number(year) - 1 : Number(year);
        const fiscalPairs = [];
        for (let i = 0; i <= selIdx; i++) {
          const m = MONTHS[i];
          const y = i <= 8 ? fiscalStartYear : fiscalStartYear + 1;
          fiscalPairs.push({ month: m, year: String(y) });
        }

        // pick latest per month in window
        const ts = (d) => new Date(d?.updatedAt || d?.createdAt || 0).getTime() || 0;
        const latestByMY = new Map(); // `${m}|${y}` -> doc
        for (const d of all) {
          const m = String(d?.month || "").trim();
          const y = String(d?.year || "").trim();
          if (!fiscalPairs.some(p => p.month === m && p.year === y)) continue;
          const k = `${m}|${y}`;
          const prev = latestByMY.get(k);
          if (!prev || ts(d) >= ts(prev)) latestByMY.set(k, d);
        }

        // sum q1..q84 across window
        const out = {}; for (let i = 1; i <= 84; i++) out[`q${i}`] = 0;
        for (const p of fiscalPairs) {
          const d = latestByMY.get(`${p.month}|${p.year}`);
          const ans = (d && d.answers) || {};
          for (let i = 1; i <= 84; i++) { const k = `q${i}`; out[k] += Number(ans[k] ?? 0) || 0; }
        }
        if (!cancelled) setCumFallback(out);
      } catch (e) {
        console.warn("Local cumulative fallback failed:", e);
        if (!cancelled) setCumFallback(null);
      }
    })();

    return () => { cancelled = true; };
  }, [cumTotals, baseDistrict, baseInstitution, month, year]);

  // Render fields
  const {
    answers: answersRaw = {},
    cumulative: cumulativeFromServer = {},
    eyeBank,
    visionCenter,
    institution,
    district,
    updatedAt,
  } = doc || {};

  const normalizeTextNameFields = (rows) =>
    Array.isArray(rows)
      ? rows.map((row) => {
          const out = { ...(row || {}) };
          for (const k of Object.keys(out)) {
            if (/name|centre|center/i.test(k) && (out[k] === 0 || out[k] === "0")) out[k] = "";
          }
          return out;
        })
      : [];

  const eyeBankData = normalizeTextNameFields(eyeBank || doc?.eyebank || doc?.eye_bank || []);
  const visionCenterData = normalizeTextNameFields(
    visionCenter || doc?.visioncentre || doc?.vision_centre || []
  );

  // Choose cumulative: server -> local FY fallback -> stored cumulative -> {}
  const cumSrc =
    (cumTotals && Object.keys(cumTotals).length && cumTotals) ||
    (cumFallback && Object.keys(cumFallback).length && cumFallback) ||
    (cumulativeFromServer && Object.keys(cumulativeFromServer).length && cumulativeFromServer) ||
    {};

  if (!reportData) return null;

  return (
    <div className="a4-wrapper text-[12pt] font-serif">
      <div className="text-center font-bold text-[16pt] mb-1">
        NATIONAL PROGRAMME FOR CONTROL OF BLINDNESS (NPCB) KERALA
      </div>
      <div className="text-center font-semibold text-[14pt] mb-4">
        INDIVIDUAL REPORTING FORMAT
      </div>

      <div className="mb-4">
        <p><strong>District:</strong> {district}</p>
        <p><strong>Institution:</strong> {institution}</p>
        <p>
          <strong>Month:</strong> {month} {year}
          {updatedAt ? (
            <span className="ml-2 text-gray-500 no-print">
              (updated {new Date(updatedAt).toLocaleString()})
            </span>
          ) : null}
        </p>
      </div>

      {hydrating && (
        <div className="no-print mb-3 px-3 py-2 rounded bg-yellow-100 text-yellow-900">
          Loading full data…
        </div>
      )}

      <table className="table-auto w-full text-sm border border-black">
        <thead>
          <tr>
            <th className="border p-1 text-left">Description</th>
            <th className="border p-1 text-right">During the Month</th>
            <th className="border p-1 text-right">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            let qNumber = 0;
            return flatRows.map((item, idx) => {
              if (item.kind === "header") {
                return (
                  <tr key={`h-${idx}`}>
                    <td colSpan={3} className="border p-1 font-bold bg-gray-100">{item.label}</td>
                  </tr>
                );
              }
              if (item.kind === "subheader") {
                return (
                  <tr key={`sh-${idx}`}>
                    <td colSpan={3} className="border p-1 font-semibold bg-gray-50">{item.label}</td>
                  </tr>
                );
              }
              if (item.kind === "eyeBankTable") {
                return (
                  <tr key={`eb-${idx}`}>
                    <td colSpan={3} className="border p-1">
                      <EyeBankTable data={eyeBankData} disabled />
                    </td>
                  </tr>
                );
              }
              if (item.kind === "visionCenterTable") {
                return (
                  <tr key={`vc-${idx}`}>
                    <td colSpan={3} className="border p-1">
                      <VisionCenterTable data={visionCenterData} disabled />
                    </td>
                  </tr>
                );
              }
              if (item.kind === "q") {
                qNumber += 1;
                const key = `q${qNumber}`;
                const monthVal = Number(answersRaw[key] ?? 0);
                const cumVal = Number((cumSrc && cumSrc[key]) ?? 0);
                return (
                  <tr key={`r-${idx}`}>
                    <td className="border p-1">{item.row.label}</td>
                    <td className="border p-1 text-right">{monthVal}</td>
                    <td className="border p-1 text-right">{cumVal}</td>
                  </tr>
                );
              }
              return null;
            });
          })()}
        </tbody>
      </table>

      <div className="flex justify-between mt-8">
        <div>
          Signature of Senior Optometrist / Optometrist
          <br />.........................................
        </div>
        <div>
          Signature of Superintendent / Medical Officer
          <br />.........................................
        </div>
      </div>
    </div>
  );
}
