"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminTablesPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [tableCode, setTableCode] = useState("");
  const [creating, setCreating] = useState(false);

  const [qrModal, setQrModal] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);

  /* ---------------- MOUNT GUARD ---------------- */
  useEffect(() => setMounted(true), []);

  /* ---------------- FETCH TABLES ---------------- */
  const fetchTables = async () => {
    const token = localStorage.getItem("adminToken");
    if (!token) return router.push("/admin/login");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setTables(await res.json());
    } catch {
      setError("Failed to load tables");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchTables();
  }, [mounted]);

  /* ---------------- CREATE TABLE ---------------- */
  const createTable = async () => {
    if (!tableCode.trim()) return;

    setCreating(true);
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tableCode }),
      });
      if (!res.ok) throw new Error();

      setTableCode("");
      setShowCreateModal(false);
      fetchTables();
    } catch {
      alert("Failed to create table");
    } finally {
      setCreating(false);
    }
  };

  /* ---------------- TOGGLE STATUS ---------------- */
  const toggleStatus = async (table) => {
    const token = localStorage.getItem("adminToken");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${table._id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !table.isActive }),
      }
    );

    fetchTables();
  };

  /* ---------------- LOAD QR ---------------- */
  const openQr = async (table) => {
    setQrModal(table);
    setQrLoading(true);
    setQrData(null);

    const token = localStorage.getItem("adminToken");
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/tables/${table._id}/qr`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await res.json();
    setQrData(data);
    setQrLoading(false);
  };

  /* ---------------- RENDER GUARDS ---------------- */
  if (!mounted) return null;
  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 text-white">
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-semibold">Tables</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 rounded"
        >
          + Create Table
        </button>
      </div>

      <table className="w-full border border-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-3 text-left">Table</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Created</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {tables.map((t) => (
            <tr key={t._id} className="border-t border-gray-700">
              <td className="p-3 font-medium">{t.tableCode}</td>

              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    t.active ? "bg-green-600" : "bg-red-600"
                  }`}
                >
                  {t.active ? "Active" : "Inactive"}
                </span>
              </td>

              <td className="p-3 text-gray-400">
                {new Date(t.createdAt).toLocaleString()}
              </td>

              <td className="p-3 flex gap-2">
                <button
                  onClick={() => toggleStatus(t)}
                  className={`px-3 py-1 rounded text-sm ${
                    t.active ? "bg-red-600" : "bg-green-600"
                  }`}
                >
                  {t.active ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => openQr(t)}
                  className="px-3 py-1 bg-gray-700 rounded text-sm"
                >
                  View QR
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-full max-w-md">
            <h2 className="text-xl mb-4">Create Table</h2>

            <input
              className="w-full p-2 mb-4 bg-gray-800 rounded"
              placeholder="Table Code"
              value={tableCode}
              onChange={(e) => setTableCode(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>
              <button
                onClick={createTable}
                disabled={creating}
                className="px-4 py-2 bg-green-600 rounded"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR MODAL */}
      {qrModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-full max-w-sm text-center">
            <h2 className="text-lg mb-4">
              QR for {qrModal.tableCode}
            </h2>

            {qrLoading && (
              <div className="text-gray-400">Generating QR...</div>
            )}

            {qrData && (
              <>
                <img
                  src={qrData.qrDataUrl}
                  alt="QR Code"
                  className="mx-auto mb-4"
                />
                <a
                  href={qrData.qrDataUrl}
                  download={`table-${qrModal.tableCode}.png`}
                  className="block mb-2 text-blue-400 underline"
                >
                  Download QR
                </a>
                <div className="text-xs text-gray-400 break-all">
                  {qrData.qrUrl}
                </div>
              </>
            )}

            <button
              onClick={() => {
                setQrModal(null);
                setQrData(null);
              }}
              className="mt-4 px-4 py-2 bg-gray-700 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
