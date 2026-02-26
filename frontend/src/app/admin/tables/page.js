"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

export default function AdminTablesPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [tables, setTables] = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableCode, setTableCode] = useState("");
  const [creating, setCreating] = useState(false);
  const [qrModal, setQrModal] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  useEffect(() => setMounted(true), []);

  const fetchTables = async () => {
    const token = getAdminToken();
    if (!token) return router.replace("/admin/login");
    try {
      setError(null);
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => []);
      if (res.status === 401) { router.replace("/admin/login"); return; }
      if (!res.ok) throw new Error(data?.message || "Failed to load tables");
      setTables(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiters = async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load waiters");
      setWaiters(Array.isArray(data.waiters) ? data.waiters : []);
    } catch (e) {
      console.error("fetchWaiters:", e.message);
      setWaiters([]);
    }
  };

  useEffect(() => {
    if (mounted) { fetchTables(); fetchWaiters(); }
  }, [mounted]);

  const createTable = async () => {
    if (!tableCode.trim()) return;
    setCreating(true);
    const token = getAdminToken();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tableCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create table");
      setTableCode("");
      setShowCreateModal(false);
      fetchTables();
    } catch (e) {
      alert(e.message || "Failed to create table");
    } finally {
      setCreating(false);
    }
  };

  const deleteTable = async (id) => {
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchTables();
  };

  const toggleStatus = async (table) => {
    const token = getAdminToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${table._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !table.isActive }),
    });
    fetchTables();
  };

  const assignWaiter = async (tableId, waiterIdOrNull) => {
    const token = getAdminToken();
    if (!token) return router.replace("/admin/login");
    setAssigningId(tableId);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${tableId}/assign-waiter`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ waiterId: waiterIdOrNull || null }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to assign waiter");
      setTables((prev) =>
        prev.map((t) =>
          t._id === tableId
            ? { ...t, assignedWaiterId: data?.table?.assignedWaiterId || null }
            : t
        )
      );
    } catch (e) {
      alert(e.message || "Failed to assign waiter");
    } finally {
      setAssigningId(null);
    }
  };

  const openQr = async (table) => {
    setQrModal(table);
    setQrLoading(true);
    setQrData(null);
    const token = getAdminToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/qr/tables/${table._id}/qr`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => ({}));
    setQrData(data);
    setQrLoading(false);
  };

  if (!mounted) return null;
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-300">Loading tables...</p>
        </div>
      </div>
    );
  if (error)
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md">
          <p className="text-red-400 text-center">{error}</p>
        </div>
      </div>
    );

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Table Management</h1>
            <p className="text-gray-400">Manage your restaurant tables, QR codes, and waiter assignment</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Table
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-12 text-center">
            <p className="text-gray-400">No tables yet. Create your first table to get started.</p>
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Table</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Assigned Waiter</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {tables.map((t) => (
                  <tr key={t._id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {t.tableCode.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-semibold">{t.tableCode}</span>
                      </div>
                    </td>

                    {/* ✅ FIX: Show phone instead of email — waiters don't have email */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={t.assignedWaiterId || ""}
                          onChange={(e) => assignWaiter(t._id, e.target.value || null)}
                          disabled={assigningId === t._id}
                          className="bg-gray-900/50 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Unassigned</option>
                          {waiters.map((w) => (
                            <option key={w._id} value={w._id}>
                              {/* ✅ FIX: w.phone not w.email */}
                              {w.name} ({w.phone || "no phone"})
                            </option>
                          ))}
                        </select>
                        {assigningId === t._id && (
                          <span className="text-xs text-gray-400">Saving...</span>
                        )}
                      </div>
                      {waiters.length === 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          No waiters yet. Create them from the Waiters page.
                        </p>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        t.isActive
                          ? "bg-green-500/20 text-green-400 border border-green-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${t.isActive ? "bg-green-400" : "bg-red-400"}`} />
                        {t.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleStatus(t)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            t.isActive
                              ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                              : "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                          }`}
                        >
                          {t.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          onClick={() => openQr(t)}
                          className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium border border-gray-600 transition"
                        >
                          View QR
                        </button>
                        <button
                          onClick={() => { if (!confirm("Delete this table?")) return; deleteTable(t._id); }}
                          className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium border border-red-500/30 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">Create New Table</h2>
              <p className="text-gray-400 text-sm mt-1">Add a new table to your restaurant</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Table Code</label>
              <input
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="e.g. T1, T2, A1..."
                value={tableCode}
                onChange={(e) => setTableCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createTable()}
                autoFocus
              />
            </div>
            <div className="flex gap-3 p-6 bg-gray-900/30">
              <button
                onClick={() => { setShowCreateModal(false); setTableCode(""); }}
                className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={createTable}
                disabled={creating || !tableCode.trim()}
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create Table"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white">QR Code</h2>
              <p className="text-gray-400 text-sm mt-1">Table: {qrModal.tableCode}</p>
            </div>
            <div className="p-8">
              {qrLoading && (
                <div className="text-center py-8">
                  <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                  <p className="text-gray-400">Generating QR code...</p>
                </div>
              )}
              {qrData?.qrDataUrl && (
                <div className="text-center">
                  <div className="bg-white p-4 rounded-xl inline-block mb-6 shadow-lg">
                    <img src={qrData.qrDataUrl} alt="QR Code" className="w-64 h-64" />
                  </div>
                  <a
                    href={qrData.qrDataUrl}
                    download={`table-${qrModal.tableCode}.png`}
                    className="block mb-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                  >
                    Download QR Code
                  </a>
                  <div className="bg-gray-900/50 p-3 rounded-lg">
                    <p className="text-xs text-gray-400 break-all font-mono">{qrData.qrUrl}</p>
                  </div>
                </div>
              )}
              {!qrLoading && !qrData?.qrDataUrl && (
                <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 text-center">
                  <p className="text-red-400 text-sm">Failed to load QR code.</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-900/30">
              <button
                onClick={() => { setQrModal(null); setQrData(null); }}
                className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}