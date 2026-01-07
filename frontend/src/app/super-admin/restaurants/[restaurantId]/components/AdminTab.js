"use client";

import { useEffect, useState } from "react";

export default function AdminTab({ restaurantId }) {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  /* ---------------- FETCH CURRENT ADMIN ---------------- */
  useEffect(() => {
    const fetchAdmin = async () => {
      try {
        const token = localStorage.getItem("superAdminToken");

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load admin");

        if (data.admin) {
          setCurrentAdmin(data.admin);
          setAdminName(data.admin.name || "");
          setAdminEmail(data.admin.email || "");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdmin();
  }, [restaurantId]);

  /* ---------------- ASSIGN / CREATE ADMIN ---------------- */
  const saveAdmin = async () => {
    if (!adminEmail.trim()) {
      alert("Admin email is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("superAdminToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            adminName,
            adminEmail,
            adminPassword: adminPassword || undefined,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to assign admin");

      alert("Admin assigned successfully");
      setAdminPassword("");
      setCurrentAdmin(data.admin);
    } catch (err) {
      alert(err.message || "Failed to assign admin");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) return <div className="text-gray-400">Loading admin…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="max-w-xl space-y-6">
      {/* CURRENT ADMIN */}
      <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
        <h3 className="text-sm text-gray-400 mb-2">Current Admin</h3>

        {currentAdmin ? (
          <>
            <div className="font-medium">{currentAdmin.name}</div>
            <div className="text-sm text-gray-400">
              {currentAdmin.email}
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-sm">
            No admin assigned yet
          </div>
        )}
      </div>

      {/* ASSIGN ADMIN */}
      <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-900">
        <h3 className="text-lg font-semibold mb-4">
          Assign Restaurant Admin
        </h3>

        <input
          className="w-full mb-3 p-2 rounded bg-neutral-800 border border-neutral-700"
          placeholder="Admin Name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
        />

        <input
          className="w-full mb-3 p-2 rounded bg-neutral-800 border border-neutral-700"
          placeholder="Admin Email"
          value={adminEmail}
          onChange={(e) => setAdminEmail(e.target.value)}
        />

        <input
          type="password"
          className="w-full mb-4 p-2 rounded bg-neutral-800 border border-neutral-700"
          placeholder="Admin Password (only for new admin)"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />

        <button
          onClick={saveAdmin}
          disabled={saving}
          className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Assign Admin"}
        </button>
      </div>
    </div>
  );
}
