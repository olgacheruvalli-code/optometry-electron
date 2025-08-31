import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MenuBar({ onMenu, onLogout, active, user }) {
  const isDistrictCoordinator = user?.institution?.startsWith("DOC ");
  const [openSubmenuKey, setOpenSubmenuKey] = useState(null);
  const submenuRefs = useRef({});

  useEffect(() => {
    function handleClickOutside(event) {
      const isClickInsideAny = Object.values(submenuRefs.current).some(
        (ref) => ref && ref.contains(event.target)
      );
      if (!isClickInsideAny) {
        setOpenSubmenuKey(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Only show "View/Edit Reports" if NOT DOC
  const menuItems = [
    { key: "entry", label: "Report Entry" },
    ...(!isDistrictCoordinator ? [{ key: "view", label: "View/Edit Reports" }] : []),
    { key: "search", label: "Search Reports" },
    { key: "print", label: "Print Reports" },
    { key: "edit", label: "Edit Report" },
  ];

  if (isDistrictCoordinator) {
    menuItems.push({
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

        // ── NEW DOWNLOAD ITEMS (appended at the end) ─────────────────────────────
        { key: "district-dl-inst", label: "Download Institution-wise (.xlsx)" },
        { key: "district-dl-ebvc", label: "Download Eye Bank & Vision Center (.xlsx)" },
        // ─────────────────────────────────────────────────────────────────────────
      ],
    });
  }

  menuItems.push({
    key: "others-connected",
    label: "connected Link",
    sub: [
      { key: "blind-register", label: "Blind Register" },
      { key: "cataract-backlog", label: "Cataract Backlog" },
      { key: "vc-issues", label: "Vision Center Related Issues" },
    ],
  });

  return (
    <div className="w-full border-b border-gray-200">
      {/* Top white bar with title and user info */}
      <div className="bg-white flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">OPTOMETRY</h1>
        <div className="flex items-center gap-4">
          <div className="text-right text-sm text-gray-700 leading-tight font-medium">
            <div>District: <b>{user?.district}</b></div>
            <div>Institution: <b>{user?.institution}</b></div>
          </div>
          <div className="w-9 h-9 bg-[#3b6e8f] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.7 0 4.5-1.8 4.5-4.5S14.7 3 12 3 7.5 4.8 7.5 7.5 9.3 12 12 12Zm0 1.5c-3 0-9 1.5-9 4.5V21h18v-3c0-3-6-4.5-9-4.5Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Flat blue menu bar */}
      <div className="bg-[#396b84] flex items-center px-10 py-2 font-serif text-sm text-white">
        <div className="flex space-x-6 relative">
          {menuItems.map((item) =>
            item.sub ? (
              <div
                key={item.key}
                className="relative"
                ref={(el) => (submenuRefs.current[item.key] = el)}
              >
                <button
                  onClick={() =>
                    setOpenSubmenuKey(openSubmenuKey === item.key ? null : item.key)
                  }
                  className={`px-4 py-2 rounded-md flex items-center gap-2 font-semibold tracking-wide transition ${
                    active?.startsWith?.(item.key) ? "bg-[#2f5a70]" : "hover:bg-[#2f5a70]"
                  }`}
                >
                  {item.label}
                  <ChevronDown className="w-4 h-4" />
                </button>

                {openSubmenuKey === item.key && (
                  <div className="absolute top-full mt-1 left-0 flex flex-col bg-[#396b84] text-white rounded-md shadow-lg z-50 min-w-[280px]">
                    {item.sub.map((subItem) => (
                      <button
                        key={subItem.key}
                        onClick={() => {
                          setOpenSubmenuKey(null);
                          onMenu(subItem.key);
                        }}
                        className="px-6 py-2 text-left hover:bg-[#2f5a70] whitespace-nowrap"
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={item.key}
                onClick={() => onMenu(item.key)}
                className={`px-4 py-2 rounded-md font-semibold tracking-wide transition ${
                  active === item.key ? "bg-[#2f5a70]" : "hover:bg-[#2f5a70]"
                }`}
              >
                {item.label}
              </button>
            )
          )}
        </div>

        <div className="ml-auto">
          <button
            onClick={onLogout}
            className="bg-white hover:bg-gray-100 px-6 py-2 rounded-md font-semibold text-[#dc2626] transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
