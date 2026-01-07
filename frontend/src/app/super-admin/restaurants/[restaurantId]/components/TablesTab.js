"use client";

import { useState } from "react";

export default function TablesTab({ restaurantId }) {
  const [count, setCount] = useState(10);
  const [prefix, setPrefix] = useState("T");
  const [startFrom, setStartFrom] = useState(1);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /* ---------------- BULK CREATE ---------------- */
  const createTables = async () => {
    if (!count || count < 1) {
      alert("Table count must be at least 1");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem("superAdminToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}/tables/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            count: Number(count),
            prefix,
            startFrom: Number(startFrom),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create tables");

      setResult(data);
    } catch (err) {
      setError(err.message || "Failed to create tables");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold">Bulk Create Tables</h3>

      {/* INPUTS */}
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Number of Tables
          </label>
          <input
            type="number"
            min="1"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Table Prefix
          </label>
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value.toUpperCase())}
            className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
            placeholder="T"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Start From
          </label>
          <input
            type="number"
            min="1"
            value={startFrom}
            onChange={(e) => setStartFrom(e.target.value)}
            className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
          />
        </div>
      </div>

      {/* ACTION */}
      <button
        onClick={createTables}
        disabled={loading}
        className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create Tables"}
      </button>

      {/* RESULT */}
      {result && (
        <div className="mt-4 text-sm space-y-1">
          <div className="text-green-400">
            Created: {result.createdCount}
          </div>
          <div className="text-yellow-400">
            Skipped (already existed): {result.skippedCount}
          </div>
        </div>
      )}

      {error && <div className="text-red-400">{error}</div>}
    </div>
  );
}
