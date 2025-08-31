import React from "react";

const onlyDigits = (s) => String(s ?? "").replace(/[^\d-]/g, "");
const toStr = (v) => (v == null ? "" : String(v));

/**
 * Universal QuestionInput
 * Supports BOTH prop shapes:
 *  - { q, value, onChange, disabled }
 *  - { question, value, cumulativeValue, onChange, onCumulativeChange, disabled }
 *
 * If onCumulativeChange/cumulativeValue is present => renders dual inputs (Month + Cumulative).
 * Works for simple and sub-question forms safely (no crashes when q/question/sub is missing).
 */
export default function QuestionInput(props) {
  const {
    q,
    question,
    value,
    cumulativeValue,
    onChange = () => {},
    onCumulativeChange,
    disabled = false,
  } = props;

  // Normalize to one object
  const item = question || q || {};
  const { key: qkey = "", label = "", sub = null } = item || {};

  // If nothing meaningful to render, bail safely
  if (!qkey && !Array.isArray(sub)) return null;

  // Dual mode: render cumulative input if provided
  const dual =
    typeof onCumulativeChange === "function" || cumulativeValue !== undefined;

  // Simple handlers (no sub)
  const handleMainChange = (e) => onChange(onlyDigits(e.target.value));
  const handleMainCumChange = (e) =>
    onCumulativeChange && onCumulativeChange(onlyDigits(e.target.value));

  // Sub handlers (value/cumulativeValue are objects keyed by sub.key)
  const ensureObj = (v) => (v && typeof v === "object" ? v : {});
  const handleSubChange = (subKey, e) => {
    const next = { ...ensureObj(value) };
    next[subKey] = onlyDigits(e.target.value);
    onChange(next);
  };
  const handleSubCumChange = (subKey, e) => {
    if (!onCumulativeChange) return;
    const next = { ...ensureObj(cumulativeValue) };
    next[subKey] = onlyDigits(e.target.value);
    onCumulativeChange(next);
  };

  // No sub-questions => single row
  if (!Array.isArray(sub) || sub.length === 0) {
    return (
      <div className="font-serif">
        <div
          className={`grid ${
            dual ? "grid-cols-[auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto]"
          } items-center gap-x-4 gap-y-2`}
        >
          <div className="text-[#134074] font-medium pr-4">{label}</div>
          <div />
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={7}
            value={toStr(value)}
            onChange={handleMainChange}
            disabled={disabled}
            className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
          />
          {dual && (
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={7}
              value={toStr(cumulativeValue)}
              onChange={handleMainCumChange}
              disabled={disabled}
              className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
            />
          )}
        </div>
      </div>
    );
  }

  // With sub-questions
  const monthMap = ensureObj(value);
  const cumMap = ensureObj(cumulativeValue);

  return (
    <div className="font-serif">
      <div className="text-[#134074] font-medium mb-2">{label}</div>
      <div className="space-y-6 pl-10">
        {sub.filter(Boolean).map((subq, index) => {
          const skey = subq?.key;
          if (!skey) return null;
          return (
            <div
              key={skey}
              className={`grid ${
                dual
                  ? "grid-cols-[auto_1fr_auto_auto]"
                  : "grid-cols-[auto_1fr_auto]"
              } items-center gap-x-4 gap-y-2`}
            >
              <div className="text-[#134074] w-5 font-semibold">
                {String.fromCharCode(97 + index)}){/* a), b), c)… */}
              </div>
              <div className="text-[#134074]">{subq?.label || ""}</div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={7}
                value={toStr(monthMap[skey])}
                onChange={(e) => handleSubChange(skey, e)}
                disabled={disabled}
                className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
              />
              {dual && (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={7}
                  value={toStr(cumMap[skey])}
                  onChange={(e) => handleSubCumChange(skey, e)}
                  disabled={disabled}
                  className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
