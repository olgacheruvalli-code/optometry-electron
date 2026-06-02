import React, { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MenuBar({ onMenu, onLogout, active, user }) {
  const instStr = String(user?.institution || "").trim().toLowerCase();
  const roleStr = String(user?.role || "").trim().toLowerCase();
  const isDistrictCoordinator =
    !!(user?.isDoc ||
      roleStr === "doc" ||
      roleStr === "dc" ||
      /^doc/i.test(instStr) ||
      /^dc/i.test(instStr) ||
      /^doc/i.test(user?.username || "") ||
      /^dc/i.test(user?.username || "") ||
      user?.role === "DOC");
  const isGuest = !!user?.isGuest;
  const [openSubmenuKey, setOpenSubmenuKey] = useState(null);
  const submenuRefs = useRef({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSubmenuKey, setExpandedSubmenuKey] = useState(null);

  useEffect(() => {
    function handleClickOutside(event) {
      const isClickInsideAny = Object.values(submenuRefs.current).some(
        (ref) => ref && ref.contains(event.target)
      );
      if (!isClickInsideAny) setOpenSubmenuKey(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* --------------------------- Connected Links --------------------------- */
  const district = String(user?.district || "");
  const districtLower = district.toLowerCase();

  // Default: empty links (other districts can be filled later)
  const emptyLinks = {
    blindRegister: "",
    cataractBacklog: "",
    oldAgedSpectacles: "",
    schoolSpectacles: "",
  };

  // Per-district links. Filled only for Kozhikode as requested.
  const connectedLinksMap = {
    kozhikode: {
      blindRegister:
        "https://docs.google.com/spreadsheets/d/19MlrGzm6WYUEt7BRFP2VMxhUOzOd_C7sHloI7LBBXrI/edit?gid=0#gid=0",
      cataractBacklog:
        "https://docs.google.com/spreadsheets/d/1DMOOQ3ZVyxPlgVhl3vI0huDcb1vuGNVkaPsokxdler4/edit?gid=0#gid=0",
      oldAgedSpectacles:
        "https://docs.google.com/spreadsheets/d/1lNOg6bl5NJu2j8q-BVITfkdL3CWwsC65pWM29fioPhw/edit?gid=738688079#gid=738688079",
      schoolSpectacles:
        "https://docs.google.com/spreadsheets/d/1MDhuyGOamcoHv1Gl0hkcqeP86hQeY84O3X3KZvMx0pc/edit?gid=1604714197#gid=1604714197",
    },
  };

  const connectedLinks = connectedLinksMap[districtLower] || emptyLinks;

  // Helper to open external link (if available) or fall back to onMenu key
  const openLinkOrMenu = (url, fallbackKey) => {
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      setOpenSubmenuKey(null);
    } else {
      setOpenSubmenuKey(null);
      onMenu(fallbackKey);
    }
  };

  const menuItems = [
    { key: "entry", label: "Report Entry" },
    ...((!isDistrictCoordinator || isGuest) ? [
      { key: "view", label: "View/Edit Reports" },
      { key: "edit", label: "Edit Report" }
    ] : []),
    { key: "search", label: "Search Reports" },
    { key: "print", label: "Print Reports" },
  ];

  if (isDistrictCoordinator || isGuest) {
    menuItems.push({
      key: "district",
      label: "District Report",
      sub: [
        { key: "district-institutions", label: "View Institution-wise Report" },
        { key: "district-tables", label: "Eye Bank Performance & Vision Center Performance" },
        { key: "performance-cataract", label: "Performance Of Cataract Surgery" },
        { key: "op-eye-diseases", label: "OP & Other Eye Diseases" },
        { key: "seh-spectacles-eyebank", label: "SEHP & Spectacles to Old Aged, Eye Bank" },
        { key: "other-diseases", label: "Details of Other Eye Diseases" },
        { key: "identified-cataract", label: "Number of Cataract Cases Identified" },
        { key: "test-vc", label: "Test VC Table" },
        // Downloads
        { key: "district-dl-inst", label: "Download Institution-wise (.xlsx)" },
        { key: "district-dl-ebvc", label: "Download Eye Bank & Vision Center (.xlsx)" },
      ],
    });
  }

  // Connected Link
  menuItems.push({
    key: "others-connected",
    label: "Connected Link",
    sub: [
      {
        key: "blind-register",
        label: "Blind Register",
        onClick: () => openLinkOrMenu(connectedLinks.blindRegister, "blind-register"),
      },
      {
        key: "cataract-backlog",
        label: "Cataract Backlog",
        onClick: () => openLinkOrMenu(connectedLinks.cataractBacklog, "cataract-backlog"),
      },
      {
        key: "old-aged-spectacles",
        label: "Old Aged - Spectacles",
        onClick: () => openLinkOrMenu(connectedLinks.oldAgedSpectacles, "old-aged-spectacles"),
      },
      {
        key: "school-spectacles",
        label: "School Children - Spectacles",
        onClick: () => openLinkOrMenu(connectedLinks.schoolSpectacles, "school-spectacles"),
      },
    ],
  });

  // NEW: Registers (New)
  menuItems.push({
    key: "registers-new",
    label: "Registers (New)",
    sub: [
      { key: "register-blind", label: "Blind Register" },
      { key: "register-cataract", label: "Cataract Backlog" },
      { key: "register-old-aged", label: "Old Aged Spectacles" },
      { key: "register-school", label: "School Children Spectacles" },
    ],
  });

  // NEW: Research / Deep Study
  menuItems.push({
    key: "research",
    label: "Research/Deep Study",
    sub: [
      // ✅ Amblyopia group – keys MUST match App.jsx
      { key: "research-amblyopia-entry", label: "Amblyopia – Entry" },
      { key: "research-amblyopia-view", label: "Amblyopia – View Records" },
      { key: "research-amblyopia-analytics", label: "Amblyopia – Analytics Dashboard" },

      // Reserve for future conditions
      { key: "research-strabismus", label: "Strabismus (Coming Soon)" },
      { key: "research-low-vision", label: "Low Vision (Coming Soon)" },
      { key: "research-accommodative-spasm", label: "Accommodative Spasm (Coming Soon)" },
    ],
  });

  return (
    <div className="w-full border-b border-gray-200">
      {/* Top white bar with title, user info, and Hamburger toggle */}
      <div className="bg-white flex justify-between items-center px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">OPTOMETRY</h1>
        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right text-sm text-gray-700 leading-tight font-medium">
            <div>
              District: <b>{user?.district}</b>
            </div>
            <div>
              Institution: <b>{user?.institution}</b>
            </div>
          </div>
          <div className="hidden md:flex w-9 h-9 bg-[#3b6e8f] rounded-full items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 12c2.7 0 4.5-1.8 4.5-4.5S14.7 3 12 3 7.5 4.8 7.5 7.5 9.3 12 12 12Zm0 1.5c-3 0-9 1.5-9 4.5V21h18v-3c0-3-6-4.5-9-4.5Z" />
            </svg>
          </div>

          {/* Mobile Hamburger toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-gray-100 focus:outline-none"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#396b84] text-white w-full border-t border-blue-700 max-h-[calc(100vh-80px)] overflow-y-auto">
          {/* User Info inside mobile menu */}
          <div className="px-6 py-4 bg-[#2f5a70] border-b border-blue-800 text-xs">
            <div>District: <span className="font-bold">{user?.district}</span></div>
            <div className="mt-1">Institution: <span className="font-bold">{user?.institution}</span></div>
          </div>

          <div className="flex flex-col py-2 font-serif text-sm">
            {menuItems.map((item) =>
              item.sub ? (
                <div key={item.key} className="border-b border-blue-800/40">
                  <button
                    onClick={() =>
                      setExpandedSubmenuKey(expandedSubmenuKey === item.key ? null : item.key)
                    }
                    className="w-full px-6 py-3 flex justify-between items-center font-semibold text-left hover:bg-[#2f5a70]"
                  >
                    <span>{item.label}</span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${
                        expandedSubmenuKey === item.key ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {expandedSubmenuKey === item.key && (
                    <div className="bg-[#2f5a70]/50 py-1">
                      {item.sub.map((subItem) => (
                        <button
                          key={subItem.key}
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            if (typeof subItem.onClick === "function") {
                              subItem.onClick();
                            } else {
                              onMenu(subItem.key);
                            }
                          }}
                          className="w-full px-10 py-2.5 text-left hover:bg-[#2f5a70] text-gray-200 hover:text-white"
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
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onMenu(item.key);
                  }}
                  className={`w-full px-6 py-3 text-left font-semibold border-b border-blue-800/40 hover:bg-[#2f5a70] ${
                    active === item.key ? "bg-[#2f5a70]" : ""
                  }`}
                >
                  {item.label}
                </button>
              )
            )}
            
            {/* Logout button */}
            <div className="p-4">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                className="w-full bg-[#dc2626] hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded transition text-center"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Flat blue menu bar */}
      <div className="hidden md:flex bg-[#396b84] items-center justify-between px-10 py-2 font-serif text-sm text-white">
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
                          if (typeof subItem.onClick === "function") {
                            subItem.onClick();
                          } else {
                            setOpenSubmenuKey(null);
                            onMenu(subItem.key);
                          }
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

        <div className="ml-auto pl-6">
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
