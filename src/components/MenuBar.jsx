// src/components/MenuBar.jsx
import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MenuBar({ onMenu, onLogout, active, user }) {
  // Treat DOC/DC as coordinators for district menus
  const isCoordinator = /^doc\s|^dc\s/i.test(String(user?.institution || ""));

  const [open, setOpen] = useState(null);
  const refs = useRef({});

  useEffect(() => {
    const onClick = (e) => {
      const inside = Object.values(refs.current).some((r) => r && r.contains(e.target));
      if (!inside) setOpen(null);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const items = [
    { key: "entry", label: "Report Entry" },
    ...(!isCoordinator ? [{ key: "view", label: "View/Edit Reports" }] : []),
    { key: "search-proxy", label: "Search Reports", onClick: () => onMenu?.("view") },
    { key: "print", label: "Print Reports" },
    { key: "edit", label: "Edit Report" },
  ];

  if (isCoordinator) {
    items.push({
      key: "district",
      label: "District Report",
      sub: [
        { key: "district-institutions", label: "View Institution-wise Report" },
        { key: "performance-cataract", label: "Performance Of Cataract Surgery" },
        { key: "op-eye-diseases", label: "OP & Other Eye Diseases" },
        { key: "seh-spectacles-eyebank", label: "SEHP & Spectacles to Old Aged, Eye Bank" },
        { key: "district-tables", label: "Eye Bank Performance & Vision Center Performance" },
        { key: "other-diseases", label: "Details of Other Eye Diseases" },
        { key: "identified-cataract", label: "Number of Cataract Cases Identified" },
        { key: "test-vc", label: "Test VC Table" },
        { key: "district-dl-inst", label: "Download Institution-wise (.xlsx)" },
        { key: "district-dl-ebvc", label: "Download Eye Bank & Vision Center (.xlsx)" },
      ],
    });
  }

  // Connected Links (visible to everyone; routes as connected-links:<Label>)
  items.push({
    key: "connected-links",
    label: "Connected Links",
    sub: [
      { key: "blind-register", label: "Blind Register" },
      { key: "cataract-backlog", label: "Cataract Backlog" },
      { key: "old-aged-spectacles", label: "Old aged Spectacles" },
      { key: "school-children-spectacles", label: "School Children Spectacles" },
    ],
  });

  // NEW: Research / Deep Study (visible to everyone; routes as research:<Label>)
  items.push({
    key: "research",
    label: "Research / Deep Study",
    sub: [
      { key: "research-ssa", label: "School Screening Analysis" },
      { key: "research-vt", label: "Vision Therapy" },
      { key: "research-dr", label: "Diabetic Retinopathy" },
      { key: "research-glaucoma", label: "Glaucoma" },
    ],
  });

  const parentActive = (it) =>
    it.sub && (active?.startsWith?.(it.key) || it.sub.some((s) => s.key === active));

  const handleSubClick = (groupKey, subItem) => {
    setOpen(null);
    if (groupKey === "connected-links") {
      onMenu?.(`connected-links:${subItem.label}`);
    } else if (groupKey === "research") {
      onMenu?.(`research:${subItem.label}`);
    } else {
      onMenu?.(subItem.key);
    }
  };

  return (
    <div className="menu-bar w-full border-b border-gray-200">
      {/* top white strip */}
      <div className="bg-white flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl font-bold tracking-wide uppercase">OPTOMETRY</h1>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm leading-tight">
            <div>District: <b>{user?.district}</b></div>
            <div>Institution: <b>{user?.institution}</b></div>
          </div>
          <div className="w-9 h-9 bg-[#3b6e8f] rounded-full" />
          <button
            onClick={onLogout}
            className="bg-white hover:bg-gray-100 px-4 py-2 rounded-md font-semibold text-[#dc2626] border"
          >
            Logout
          </button>
        </div>
      </div>

      {/* blue menu bar */}
      <div className="bg-[#396b84] text-white font-serif text-sm px-10 py-2">
        <div className="flex items-center gap-3 relative">
          {items.map((it) =>
            it.sub ? (
              <div key={it.key} className="relative" ref={(el) => (refs.current[it.key] = el)}>
                <button
                  onClick={() => setOpen(open === it.key ? null : it.key)}
                  className={`px-4 py-2 rounded-md flex items-center gap-2 font-semibold transition
                    ${parentActive(it) ? "bg-[#2f5a70]" : "hover:bg-[#2f5a70]"}`}
                >
                  {it.label} <ChevronDown className="w-4 h-4" />
                </button>
                {open === it.key && (
                  <div className="absolute top-full left-0 mt-1 min-w-[280px] rounded-md bg-[#396b84] shadow-lg z-50">
                    {it.sub.map((s) => (
                      <button
                        key={s.key}
                        onClick={() => handleSubClick(it.key, s)}
                        className={`block w-full text-left px-6 py-2 hover:bg-[#2f5a70] whitespace-nowrap
                          ${
                            active === s.key ||
                            (active?.startsWith?.("connected-links") && it.key === "connected-links") ||
                            (active?.startsWith?.("research") && it.key === "research")
                              ? "bg-[#2f5a70]"
                              : ""
                          }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={it.key}
                onClick={() => (it.onClick ? it.onClick() : onMenu?.(it.key))}
                className={`px-4 py-2 rounded-md font-semibold transition
                  ${active === it.key ? "bg-[#2f5a70]" : "hover:bg-[#2f5a70]"}`}
              >
                {it.label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
