"use client";

import { useState } from "react";

export default function QrCodesTab({ restaurantId }) {
  const [loading, setLoading] = useState(false);
  const [qrs, setQrs] = useState([]);
  const [error, setError] = useState(null);

  const generateQrs = async () => {
    setLoading(true);
    setError(null);
    setQrs([]);

    try {
      const token = localStorage.getItem("superAdminToken");

      const baseUrl =
        process.env.NEXT_PUBLIC_CUSTOMER_BASE_URL ||
        window.location.origin;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}/tables/qrs?baseUrl=${encodeURIComponent(
          baseUrl
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to generate QR codes");

      setQrs(data.qrs || []);
    } catch (err) {
      setError(err.message || "Failed to generate QR codes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Table QR Codes</h3>

        <button
          onClick={generateQrs}
          disabled={loading}
          className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate QR Codes"}
        </button>
      </div>

      {error && <div className="text-red-400">{error}</div>}

      {qrs.length === 0 && !loading && (
        <div className="text-gray-400">
          No QR codes generated yet.
        </div>
      )}

      {/* GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {qrs.map((qr) => (
          <div
            key={qr.tableId}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 text-center"
          >
            <div className="text-sm font-medium mb-2">
              Table {qr.tableCode}
            </div>

            <img
              src={qr.qrDataUrl}
              alt={`QR ${qr.tableCode}`}
              className="mx-auto mb-3 rounded"
            />

            <a
              href={qr.qrDataUrl}
              download={`table-${qr.tableCode}.png`}
              className="text-sm text-blue-400 hover:underline"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
