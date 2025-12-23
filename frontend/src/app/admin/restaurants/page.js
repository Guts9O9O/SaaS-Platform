"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminRestaurantsPage() {
  const router = useRouter();

  /* ---------------- STATE ---------------- */
  const [mounted, setMounted] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    ownerEmail: "",
    subscriptionEnd: "",
  });

  /* ---------------- MOUNT GUARD ---------------- */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ---------------- FETCH RESTAURANTS ---------------- */
  useEffect(() => {
    if (!mounted) return;

    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    fetch("http://localhost:4000/api/admin/restaurants", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Unauthorized");
        return res.json();
      })
      .then((data) => {
        setRestaurants(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load restaurants");
        setLoading(false);
      });
  }, [mounted, router]);

  /* ---------------- RENDER GUARDS ---------------- */
  if (!mounted) return null;
  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  /* ---------------- UI ---------------- */
  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Restaurants</h1>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          + Create Restaurant
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Owner</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Subscription</th>
              <th className="p-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {restaurants.map((r) => (
              <tr key={r._id} className="border-t border-gray-700">
                <td className="p-3">{r.name}</td>
                <td className="p-3">{r.ownerName || "-"}</td>
                <td className="p-3">{r.ownerEmail}</td>
                <td className="p-3">
                  {r.subscriptionEnd
                    ? new Date(r.subscriptionEnd).toLocaleDateString()
                    : "—"}
                </td>
                <td className="p-3">
                  <button
                    onClick={async () => {
                      const token = localStorage.getItem("adminToken");

                      await fetch(
                        `http://localhost:4000/api/admin/restaurants/${r._id}/status`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({ active: !r.active }),
                        }
                      );

                      window.location.reload();
                    }}
                    className={`px-2 py-1 rounded text-sm ${
                      r.active ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {r.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---------------- CREATE MODAL ---------------- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded w-full max-w-md">
            <h2 className="text-xl mb-4">Create Restaurant</h2>

            {["name", "ownerName", "ownerEmail", "subscriptionEnd"].map(
              (field) => (
                <input
                  key={field}
                  type={field === "subscriptionEnd" ? "date" : "text"}
                  placeholder={field}
                  className="w-full mb-3 p-2 bg-gray-800 rounded"
                  value={form[field]}
                  onChange={(e) =>
                    setForm({ ...form, [field]: e.target.value })
                  }
                />
              )
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  const token = localStorage.getItem("adminToken");

                  /* 🔒 FILTER EMPTY FIELDS (FIX) */
                  const payload = {};
                  Object.entries(form).forEach(([key, value]) => {
                    if (value && value.trim() !== "") {
                      payload[key] = value;
                    }
                  });

                  await fetch(
                    "http://localhost:4000/api/admin/restaurants",
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(payload),
                    }
                  );

                  setShowModal(false);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-green-600 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
