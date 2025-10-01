// src/components/ConnectedLinks.jsx
import React, { useMemo, useState } from "react";
import LINKS_CONFIG, { SUBMENUS } from "../data/connectedLinks";

export default function ConnectedLinks({ user, initialTab = "" }) {
  const district = String(user?.district || "").trim();
  const institution = String(user?.institution || "").trim();

  // Only read links configured for THIS district.
  const districtLinks = (LINKS_CONFIG && LINKS_CONFIG[district]) || {};

  // Keep submenu tabs in a stable, expected order:
  // 1) the known SUBMENUS order, but only those present
  // 2) any extra keys not in SUBMENUS, appended after
  const categories = useMemo(() => {
    const keys = Object.keys(districtLinks || {});
    const orderedKnown = SUBMENUS.filter((k) => keys.includes(k));
    const extras = keys.filter((k) => !SUBMENUS.includes(k));
    return [...orderedKnown, ...extras];
  }, [districtLinks]);

  const firstCat =
    initialTab && categories.includes(initialTab)
      ? initialTab
      : categories[0] || null;

  const [active, setActive] = useState(firstCat);

  // Normalize a category's items to [{label, url}, ...]
  const normalizeItems = (value) => {
    if (!value) return [];
    if (typeof value === "string") return [{ label: value, url: value }];

    if (Array.isArray(value)) {
      return value
        .map((v) => {
          if (typeof v === "string") return { label: v, url: v };
          if (v && typeof v === "object") {
            const label = v.label || v.url || "Open link";
            const url = v.url || "";
            return { label, url };
          }
          return null;
        })
        .filter((x) => x && x.url);
    }

    if (typeof value === "object") {
      const label = value.label || value.url || "Open link";
      const url = value.url || "";
      return url ? [{ label, url }] : [];
    }

    return [];
  };

  if (!district || categories.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white rounded-xl shadow font-serif">
        <div className="text-lg font-semibold text-gray-800">
          No connected links configured for your district.
        </div>
        <div className="text-sm text-gray-600 mt-1">
          District: <b>{district || "—"}</b>
        </div>
      </div>
    );
  }

  const items = normalizeItems(districtLinks[active]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow font-serif">
      <h2 className="text-2xl font-bold text-[#134074] mb-4">Connected Links</h2>
      <div className="text-sm text-[#016eaa] mb-3">
        District: <b>{district}</b> &nbsp;|&nbsp; Institution: <b>{institution}</b>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map((cat) => {
          const isActive = cat === active;
          return (
            <button
              key={cat}
              className={
                "px-3 py-1.5 rounded border " +
                (isActive
                  ? "bg-[#134074] text-white border-[#134074]"
                  : "bg-gray-50 text-[#134074] hover:bg-gray-100 border-gray-300")
              }
              onClick={() => setActive(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Links list for active category */}
      {items.length === 0 ? (
        <div className="text-gray-600">No links configured for “{active}”.</div>
      ) : (
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div
              key={`${active}-${idx}-${it.url}`}
              className="p-3 rounded border border-gray-200 flex items-center justify-between"
            >
              <div className="pr-3">
                <div className="font-medium">{it.label || "Open link"}</div>
                <div className="text-xs text-gray-500 break-all">{it.url}</div>
              </div>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Open
              </a>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        Tip: also restrict access on the Google Sheets themselves if needed.
      </div>
    </div>
  );
}
