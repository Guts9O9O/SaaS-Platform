"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminRestaurantsPage() {
  const router = useRouter();

  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");

  const [contact, setContact] = useState("");

  /* ---------------- FETCH RESTAURANTS ---------------- */
  const fetchRestaurants = async () => {
    const token = localStorage.getItem("superAdminToken");
    if (!token) return router.push("/super-admin/login");

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load restaurants");

      setRestaurants(data.restaurants || []);
    } catch (err) {
      setError(err.message || "Failed to load restaurants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- CREATE RESTAURANT ---------------- */
  const createRestaurant = async () => {
    if (!name.trim() || !contact.trim()) return;

    const token = localStorage.getItem("superAdminToken");
    setCreating(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
            contact,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create restaurant");

      setName("");
      setSlug("");
      setShowCreate(false);
      fetchRestaurants();
    } catch (err) {
      alert(err.message || "Failed to create restaurant");
    } finally {
      setCreating(false);
    }
  };

  /* ---------------- TOGGLE STATUS ---------------- */
  const toggleStatus = async (r) => {
    const token = localStorage.getItem("superAdminToken");

    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${r._id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !r.isActive }),
      }
    );

    fetchRestaurants();
  };

  /* ---------------- UI ---------------- */
  if (loading) {
    return <div className="text-gray-400">Loading restaurants…</div>;
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="text-white">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Restaurants</h1>

        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition"
        >
          + Add Restaurant
        </button>
      </div>

      {/* TABLE */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-gray-400">
            <tr>
              <th className="p-3 text-left">Name</th>
              <th className="p-3 text-left">Slug</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>

          <tbody>
            {restaurants.map((r) => (
              <tr
                key={r._id}
                className="border-t border-neutral-800 hover:bg-neutral-900 transition"
              >
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-gray-400">{r.slug}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      r.isActive
                        ? "bg-green-700 text-green-100"
                        : "bg-red-700 text-red-100"
                    }`}
                  >
                    {r.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="p-3 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/super-admin/restaurants/${r._id}`)
                    }
                    className="px-3 py-1 rounded text-xs bg-neutral-800 hover:bg-neutral-700"
                  >
                    View
                  </button>

                  <button
                    onClick={() => toggleStatus(r)}
                    className={`px-3 py-1 rounded text-xs ${
                      r.isActive
                        ? "bg-red-700 hover:bg-red-600"
                        : "bg-green-700 hover:bg-green-600"
                    }`}
                  >
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}

            {restaurants.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="p-6 text-center text-gray-500"
                >
                  No restaurants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg mb-4 font-semibold">
              Create Restaurant
            </h2>

            <input
              className="w-full mb-3 p-2 rounded bg-neutral-800 border border-neutral-700"
              placeholder="Restaurant Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full mb-3 p-2 rounded bg-neutral-800 border border-neutral-700"
              placeholder="Contact (phone or email)"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
            <input
              className="w-full mb-4 p-2 rounded bg-neutral-800 border border-neutral-700"
              placeholder="Slug (e.g. demo-restaurant)"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded bg-neutral-800 hover:bg-neutral-700"
              >
                Cancel
              </button>
              <button
                onClick={createRestaurant}
                disabled={creating}
                className="px-4 py-2 rounded bg-green-700 hover:bg-green-600"
              >
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
