import React, { useEffect, useState } from "react";

const onlyDigits = (s) => String(s ?? "").replace(/[^\d]/g, "");
const toStr = (v) => (v == null ? "" : String(v));

/**
 * Universal QuestionInput
 * Supports BOTH prop shapes:
 *  - { q, value, onChange, disabled }
 *  - { question, value, cumulativeValue, onChange, onCumulativeChange, disabled }
 *
 * If onCumulativeChange/cumulativeValue is present => renders dual inputs (Month + Cumulative).
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

  // Normalize to one object; accept either {id,label} or {key,label}
  const item = question || q || {};
  const {
    key: keyFromItem,
    id: idFromItem,
    label = "",
    sub = null,
  } = item || {};
  const primaryKey = keyFromItem || idFromItem || ""; // <- IMPORTANT: support id

  const hasSub = Array.isArray(sub) && sub.length > 0;
  const dual =
    typeof onCumulativeChange === "function" || cumulativeValue !== undefined;

  // Handlers for simple rows
  const handleMainChange = (e) => onChange(onlyDigits(e.target.value));
  const handleMainCumChange = (e) =>
    onCumulativeChange && onCumulativeChange(onlyDigits(e.target.value));

  // Handlers for sub-rows
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

  // SIMPLE ROW (most of your questions)
  if (!hasSub) {
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
            aria-label={primaryKey || label}
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
              aria-label={(primaryKey || label) + " cumulative"}
              className="w-[8ch] bg-gray-100 rounded px-2 py-1 text-right"
            />
          )}
        </div>
      </div>
    );
  }

  // WITH SUB-QUESTIONS (still supported)
  const monthMap = ensureObj(value);
  const cumMap = ensureObj(cumulativeValue);

  return (
    <div className="font-serif">
      <div className="text-[#134074] font-medium mb-2">{label}</div>
      <div className="space-y-6 pl-10">
        {sub.filter(Boolean).map((subq, index) => {
          const skey = subq?.key || subq?.id;
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
