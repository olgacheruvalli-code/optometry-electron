import React, { useState, useEffect, useMemo, useCallback } from "react";
import API_BASE from "../apiBase";
import { districts } from "../data/districtInstitutions";

export default function AdminApprovals({ user, onClose }) {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("pending"); // "pending" | "approved" | "deactivated"
  const [selectedDistrict, setSelectedDistrict] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPasswordInput, setNewPasswordInput] = useState("");

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.users)) {
        setUsers(data.users);
      }
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showNotification = (msg, isError = false) => {
    setActionMessage({ text: msg, isError });
    setTimeout(() => setActionMessage(null), 5000);
  };

  const handleApprove = async (targetUser) => {
    const isOpto = targetUser.role === "OPTOMETRIST";
    const confirmMsg = isOpto
      ? `Approve ${targetUser.name} (${targetUser.email}) for ${targetUser.institution}?\n\n⚠️ IMPORTANT: Approving this optometrist will automatically deactivate any previously active optometrist for "${targetUser.institution}".`
      : `Approve DOC account for ${targetUser.name} (${targetUser.email}) in ${targetUser.district}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/approve-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: targetUser._id,
          approvedBy: user?.username || "Developer Admin",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotification(data.message || "User approved successfully!");
        fetchUsers();
      } else {
        showNotification(data.error || "Approval failed.", true);
      }
    } catch (err) {
      showNotification("Network error during approval.", true);
    }
  };

  const handleReject = async (targetUser) => {
    if (!window.confirm(`Reject registration for ${targetUser.name} (${targetUser.email})?`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/reject-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser._id }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotification(data.message || "Registration rejected.");
        fetchUsers();
      } else {
        showNotification(data.error || "Rejection failed.", true);
      }
    } catch (err) {
      showNotification("Network error during rejection.", true);
    }
  };

  const handleDeactivate = async (targetUser) => {
    if (!window.confirm(`Deactivate account for ${targetUser.name} (${targetUser.institution})? They will no longer be able to log in.`)) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/deactivate-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: targetUser._id }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotification(data.message || "Account deactivated.");
        fetchUsers();
      } else {
        showNotification(data.error || "Deactivation failed.", true);
      }
    } catch (err) {
      showNotification("Network error during deactivation.", true);
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordInput) return;

    try {
      const res = await fetch(`${API_BASE}/api/admin/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetModalUser._id,
          newPassword: newPasswordInput,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showNotification(data.message || "Password reset successfully!");
        setResetModalUser(null);
        setNewPasswordInput("");
      } else {
        showNotification(data.error || "Password reset failed.", true);
      }
    } catch (err) {
      showNotification("Network error during password reset.", true);
    }
  };

  // Filtered lists
  const pendingUsers = useMemo(() => users.filter((u) => u.status === "pending"), [users]);
  const approvedUsers = useMemo(() => users.filter((u) => u.status === "approved"), [users]);
  const deactivatedUsers = useMemo(
    () => users.filter((u) => u.status === "deactivated" || u.status === "rejected"),
    [users]
  );

  const displayedList = useMemo(() => {
    let list =
      activeTab === "pending"
        ? pendingUsers
        : activeTab === "approved"
        ? approvedUsers
        : deactivatedUsers;

    if (selectedDistrict !== "All") {
      list = list.filter((u) => u.district === selectedDistrict);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (u) =>
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.institution && u.institution.toLowerCase().includes(q)) ||
          (u.phone && u.phone.includes(q))
      );
    }

    return list;
  }, [activeTab, pendingUsers, approvedUsers, deactivatedUsers, selectedDistrict, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 bg-white rounded-2xl shadow-lg border border-gray-100 my-4">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-200 pb-4 mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 text-xs font-bold bg-purple-100 text-purple-800 rounded-full">
              👑 Developer / Super Admin
            </span>
            <span className="text-xs text-gray-500">Master Approval Portal</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mt-1">
            Optometrist & DOC Management
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            Approve registrations, manage active optometrists, and enforce single active optometrist per institution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
          >
            {isLoading ? "Refreshing..." : "🔄 Refresh"}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition"
            >
              ✕ Close
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMessage && (
        <div
          className={`mb-4 p-3.5 rounded-xl border text-sm flex items-center justify-between ${
            actionMessage.isError
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="font-bold text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2 mb-4">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "pending"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span>⏳ Pending Approvals</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "pending"
                ? "bg-white text-amber-700"
                : pendingUsers.length > 0
                ? "bg-amber-500 text-white animate-pulse"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {pendingUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("approved")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "approved"
              ? "bg-green-700 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span>✅ Active Users</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "approved"
                ? "bg-white text-green-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {approvedUsers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("deactivated")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === "deactivated"
              ? "bg-gray-700 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <span>🚫 Deactivated / Replaced</span>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-bold ${
              activeTab === "deactivated"
                ? "bg-white text-gray-800"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {deactivatedUsers.length}
          </span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-200">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Filter by District
          </label>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="All">All Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Search by Name, Email, Institution or Phone
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-1.5 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users Table / Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-500 text-sm">
          Loading accounts...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-sm font-medium">No accounts found in this category.</p>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === "pending"
              ? "All registered optometrists and DOCs are currently approved!"
              : "No accounts match the selected filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-700 uppercase tracking-wider font-semibold border-b">
                <th className="p-3">User & Contact</th>
                <th className="p-3">District & Institution</th>
                <th className="p-3">Role</th>
                <th className="p-3">Registered / Approved</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedList.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition">
                  {/* User & Contact */}
                  <td className="p-3">
                    <div className="font-bold text-gray-900 text-sm">
                      {u.name}
                    </div>
                    <div className="text-blue-600 font-mono">{u.email}</div>
                    <div className="text-gray-500 text-[11px]">
                      📞 {u.phone || "No phone"}
                    </div>
                  </td>

                  {/* District & Institution */}
                  <td className="p-3">
                    <div className="font-semibold text-gray-800">
                      {u.institution}
                    </div>
                    <div className="text-gray-500">{u.district}</div>
                  </td>

                  {/* Role */}
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        u.role === "DOC"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {u.role === "DOC" ? "Coordinator (DOC)" : "Optometrist"}
                    </span>
                  </td>

                  {/* Date info */}
                  <td className="p-3 text-gray-500 text-[11px]">
                    <div>
                      Reg: {new Date(u.createdAt).toLocaleDateString("en-IN")}
                    </div>
                    {u.status === "approved" && u.approvedAt && (
                      <div className="text-green-700">
                        Apprv: {new Date(u.approvedAt).toLocaleDateString("en-IN")}
                      </div>
                    )}
                    {u.status === "deactivated" && u.deactivatedAt && (
                      <div className="text-red-600">
                        Deact: {new Date(u.deactivatedAt).toLocaleDateString("en-IN")}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                    {activeTab === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(u)}
                          className="px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg font-medium shadow-sm transition"
                          title="Approve this optometrist"
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={() => handleReject(u)}
                          className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition"
                          title="Reject registration"
                        >
                          ✕ Reject
                        </button>
                      </>
                    )}

                    {activeTab === "approved" && (
                      <>
                        <button
                          onClick={() => setResetModalUser(u)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition border border-blue-200"
                          title="Reset Password"
                        >
                          🔑 Reset Password
                        </button>
                        <button
                          onClick={() => handleDeactivate(u)}
                          className="px-2.5 py-1.5 bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-700 rounded-lg font-medium transition border"
                          title="Deactivate account"
                        >
                          🚫 Deactivate
                        </button>
                      </>
                    )}

                    {activeTab === "deactivated" && (
                      <button
                        onClick={() => handleApprove(u)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition"
                        title="Re-activate this account"
                      >
                        🔄 Re-activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Reset Password
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Set a new password for <b>{resetModalUser.name}</b> ({resetModalUser.institution}).
            </p>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  type="text"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Enter new password"
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setResetModalUser(null);
                    setNewPasswordInput("");
                  }}
                  className="w-1/2 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-lg shadow transition"
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
