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

  // Create form state
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [menuItemVideoLimit, setMenuItemVideoLimit] = useState(1);   // ✅ NEW: added
  const [restaurantVideoLimit, setRestaurantVideoLimit] = useState(2);

  const fetchRestaurants = async () => {
    const token = localStorage.getItem("superAdminToken");
    if (!token) return router.push("/super-admin/login");
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants`,
        { headers: { Authorization: `Bearer ${token}` } }
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
  }, []);

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
          // ✅ FIX #7: Now sends both video limit fields on creation
          body: JSON.stringify({
            name,
            contact,
            menuItemVideoLimit: Number(menuItemVideoLimit),
            restaurantVideoLimit: Number(restaurantVideoLimit),
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create restaurant");
      setName("");
      setContact("");
      setMenuItemVideoLimit(1);
      setRestaurantVideoLimit(2);
      setShowCreate(false);
      fetchRestaurants();
    } catch (err) {
      alert(err.message || "Failed to create restaurant");
    } finally {
      setCreating(false);
    }
  };

  const toggleStatus = async (r) => {
    const token = localStorage.getItem("superAdminToken");
    // ✅ FIX #4: Changed PATCH → PUT to match the route definition
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${r._id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !r.isActive }),
      }
    );
    fetchRestaurants();
  };

  if (loading) return <div className="text-gray-400">Loading restaurants…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Restaurants</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
        >
          + Add Restaurant
        </button>
      </div>

      {/* ✅ FIX #6: Corrected table columns to match actual data */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-gray-400">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Slug</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Item Video Limit</th>
              <th className="p-4 text-left">Restaurant Video Limit</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr
                key={r._id}
                className="border-t border-neutral-800 hover:bg-neutral-900 transition"
              >
                <td className="p-4 font-medium">{r.name}</td>
                <td className="p-4 text-gray-400">{r.slug}</td>
                <td className="p-4">
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
                {/* ✅ FIX #6: Correct field names, correct column order */}
                <td className="p-4 text-gray-300 text-center">
                  {r.menuItemVideoLimit ?? 1}
                </td>
                <td className="p-4 text-gray-300 text-center">
                  {r.restaurantVideoLimit ?? 2}
                </td>
                <td className="p-4 text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString()}
                </td>
                <td className="p-4 flex gap-2">
                  <button
                    onClick={() =>
                      router.push(`/super-admin/restaurants/${r._id}`)
                    }
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-sm"
                  >
                    View
                  </button>
                  <button
                    onClick={() => toggleStatus(r)}
                    className={`px-4 py-2 rounded-lg text-white text-sm ${
                      r.isActive
                        ? "bg-red-600 hover:bg-red-500"
                        : "bg-green-600 hover:bg-green-500"
                    }`}
                  >
                    {r.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
            {restaurants.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-500">
                  No restaurants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg mb-4 font-semibold">Create Restaurant</h2>

            <input
              className="w-full mb-3 p-3 rounded-lg bg-neutral-800 text-white placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Restaurant Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="w-full mb-3 p-3 rounded-lg bg-neutral-800 text-white placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Contact (phone or email) *"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />

            {/* ✅ FIX #7: Both video limit fields now present in create form */}
            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">
                Per-Item Video Limit (0–10)
              </label>
              <input
                className="w-full p-3 rounded-lg bg-neutral-800 text-white placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                min="0"
                max="10"
                placeholder="e.g. 1"
                value={menuItemVideoLimit}
                onChange={(e) => setMenuItemVideoLimit(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Max videos allowed per menu item
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-xs text-gray-400 mb-1">
                Restaurant Video Limit (0–20)
              </label>
              <input
                className="w-full p-3 rounded-lg bg-neutral-800 text-white placeholder-gray-400 border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                type="number"
                min="0"
                max="20"
                placeholder="e.g. 2"
                value={restaurantVideoLimit}
                onChange={(e) => setRestaurantVideoLimit(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total videos allowed across the restaurant
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white"
              >
                Cancel
              </button>
              <button
                onClick={createRestaurant}
                disabled={creating || !name.trim() || !contact.trim()}
                className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-50"
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