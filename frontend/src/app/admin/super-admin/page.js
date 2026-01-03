"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function getSuperAdminToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken"); // ✅ use same token key as login
}

async function apiFetch(path, { method = "GET", body } = {}) {
  const token = getSuperAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Request failed");
  return data;
}

export default function SuperAdminPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const [newRestaurant, setNewRestaurant] = useState({
    name: "",
    contact: "",
    status: "ACTIVE",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  // QR Modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrData, setQrData] = useState(null); // {restaurantName, restaurantSlug, qrs:[]}
  const [qrError, setQrError] = useState(null);

  const token = useMemo(() => getSuperAdminToken(), []);

  async function fetchRestaurants() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch(`/api/admin/super-admin/restaurants`);
      setRestaurants(data.restaurants || []);
    } catch (e) {
      setError(e.message || "Failed to fetch restaurants");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRestaurant() {
    try {
      if (!newRestaurant.name || !newRestaurant.contact) {
        alert("Restaurant name and contact are required");
        return;
      }
      if (newRestaurant.adminEmail && !newRestaurant.adminPassword) {
        alert("Admin password is required when admin email is provided");
        return;
      }

      await apiFetch(`/api/admin/super-admin/restaurants`, {
        method: "POST",
        body: newRestaurant,
      });

      setNewRestaurant({
        name: "",
        contact: "",
        status: "ACTIVE",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });

      await fetchRestaurants();
      alert("Restaurant created successfully");
    } catch (e) {
      alert(e.message || "Failed to create restaurant");
    }
  }

  async function handleUpdateSubscription(restaurantId, nextStatus, nextPlan) {
    try {
      setBusyId(restaurantId);
      await apiFetch(`/api/admin/super-admin/restaurants/${restaurantId}/subscription`, {
        method: "PUT",
        body: { subscriptionStatus: nextStatus, plan: nextPlan },
      });
      await fetchRestaurants();
    } catch (e) {
      alert(e.message || "Failed to update subscription");
    } finally {
      setBusyId(null);
    }
  }

  async function handleBulkCreateTables(restaurantId, count = 20) {
    try {
      setBusyId(restaurantId);
      const data = await apiFetch(`/api/admin/super-admin/restaurants/${restaurantId}/tables/bulk`, {
        method: "POST",
        body: { count, prefix: "T", startFrom: 1 },
      });
      alert(`Tables created: ${data.createdCount}, skipped: ${data.skippedCount}`);
    } catch (e) {
      alert(e.message || "Failed to create tables");
    } finally {
      setBusyId(null);
    }
  }

  async function openQrModal(restaurantId) {
    try {
      setQrOpen(true);
      setQrLoading(true);
      setQrError(null);
      setQrData(null);

      const baseUrl = window.location.origin;
      const data = await apiFetch(
        `/api/admin/super-admin/restaurants/${restaurantId}/tables/qrs?baseUrl=${encodeURIComponent(baseUrl)}`
      );

      setQrData(data);
    } catch (e) {
      setQrError(e.message || "Failed to fetch QRs");
    } finally {
      setQrLoading(false);
    }
  }

  function closeQrModal() {
    setQrOpen(false);
    setQrData(null);
    setQrError(null);
    setQrLoading(false);
  }

  useEffect(() => {
    if (!token) {
      router.push("/admin/super-admin-login");
      return;
    }
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-white">Super Admin Panel</h1>
        <button
          className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
          onClick={() => {
            localStorage.removeItem("adminToken");
            router.push("/admin/super-admin-login");
          }}
        >
          Logout
        </button>
      </div>

      {/* Create Restaurant */}
      <div className="mb-10 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-xl text-white mb-4">Create New Restaurant</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Restaurant Name"
            value={newRestaurant.name}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, name: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          />
          <input
            type="text"
            placeholder="Contact (phone/email)"
            value={newRestaurant.contact}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, contact: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          />

          <select
            value={newRestaurant.status}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, status: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>

          <input
            type="text"
            placeholder="Admin Name (optional)"
            value={newRestaurant.adminName}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, adminName: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          />
          <input
            type="email"
            placeholder="Admin Email (optional)"
            value={newRestaurant.adminEmail}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, adminEmail: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          />
          <input
            type="password"
            placeholder="Admin Password (required if email provided)"
            value={newRestaurant.adminPassword}
            onChange={(e) => setNewRestaurant({ ...newRestaurant, adminPassword: e.target.value })}
            className="w-full p-3 bg-gray-700 text-white rounded-md"
          />
        </div>

        <button
          onClick={handleCreateRestaurant}
          className="w-full py-3 bg-blue-600 text-white rounded-md mt-5 hover:bg-blue-700"
        >
          Create Restaurant
        </button>
      </div>

      {/* Restaurants */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold text-white mb-4">Restaurants</h2>

        {loading ? (
          <div className="text-white">Loading...</div>
        ) : error ? (
          <div className="text-red-400">{error}</div>
        ) : restaurants.length === 0 ? (
          <div className="text-white">No restaurants yet.</div>
        ) : (
          <div className="space-y-4">
            {restaurants.map((r) => {
              const isBusy = busyId === r._id;

              const nextSubStatus = r.subscriptionStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
              const nextPlan = r.plan || "FREE";

              return (
                <div
                  key={r._id}
                  className="p-4 bg-gray-800 rounded-lg shadow-lg flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                >
                  <div className="text-white">
                    <p className="font-semibold text-lg">{r.name}</p>
                    <p className="text-sm text-gray-300">
                      slug: <span className="font-mono">{r.slug}</span>
                    </p>
                    <p className="text-sm text-gray-300">
                      Status: <b>{r.status || "ACTIVE"}</b> | Plan: <b>{r.plan || "FREE"}</b> | Subscription:{" "}
                      <b>{r.subscriptionStatus || "TRIAL"}</b>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={isBusy}
                      onClick={() => handleUpdateSubscription(r._id, nextSubStatus, nextPlan)}
                      className={`px-4 py-2 rounded text-white ${
                        r.subscriptionStatus === "ACTIVE"
                          ? "bg-red-600 hover:bg-red-700"
                          : "bg-green-600 hover:bg-green-700"
                      } disabled:opacity-60`}
                    >
                      {r.subscriptionStatus === "ACTIVE" ? "Suspend" : "Activate"}
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => handleBulkCreateTables(r._id, 20)}
                      className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Create 20 Tables
                    </button>

                    <button
                      disabled={isBusy}
                      onClick={() => openQrModal(r._id)}
                      className="px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 disabled:opacity-60"
                    >
                      View QRs
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal */}
      {qrOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 w-full max-w-5xl rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <div className="text-white">
                <div className="font-semibold text-lg">QR Codes</div>
                {qrData?.restaurantName && (
                  <div className="text-sm text-gray-300">
                    {qrData.restaurantName} ({qrData.restaurantSlug})
                  </div>
                )}
              </div>
              <button
                onClick={closeQrModal}
                className="px-3 py-1 rounded bg-gray-700 text-white hover:bg-gray-600"
              >
                Close
              </button>
            </div>

            <div className="p-5">
              {qrLoading ? (
                <div className="text-white">Loading QRs...</div>
              ) : qrError ? (
                <div className="text-red-400">{qrError}</div>
              ) : !qrData?.qrs?.length ? (
                <div className="text-white">
                  No tables found. Click “Create 20 Tables” first.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[70vh] overflow-auto pr-2">
                  {qrData.qrs.map((q) => (
                    <div key={q.tableId} className="bg-gray-800 rounded-lg p-3">
                      <div className="text-white font-semibold mb-2">{q.tableCode}</div>

                      {/* QR image */}
                      <img
                        src={q.qrDataUrl}
                        alt={`QR ${q.tableCode}`}
                        className="w-full rounded bg-white p-2"
                      />

                      {/* Clickable URL */}
                      <a
                        href={q.qrText}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-2 text-sm text-blue-300 break-all hover:underline"
                      >
                        {q.qrText}
                      </a>

                      <button
                        className="mt-2 w-full px-3 py-2 rounded bg-gray-700 text-white hover:bg-gray-600"
                        onClick={() => {
                          navigator.clipboard.writeText(q.qrText);
                          alert(`Copied link for ${q.tableCode}`);
                        }}
                      >
                        Copy Link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
