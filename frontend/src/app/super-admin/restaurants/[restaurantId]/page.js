"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function SuperAdminRestaurantDetailPage() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantContact, setRestaurantContact] = useState("");
  // ✅ FIX #2: Correct field names matching the model
  const [menuItemVideoLimit, setMenuItemVideoLimit] = useState(1);
  const [restaurantVideoLimit, setRestaurantVideoLimit] = useState(2);

  // ✅ FIX #1: Correct URL with NEXT_PUBLIC_API_URL + auth token
  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("superAdminToken");
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load restaurant");

      const r = data.restaurant;
      setRestaurant(r);
      setRestaurantName(r.name || "");
      setRestaurantContact(r.contact || "");
      // ✅ FIX #2: Read correct field names from API response
      setMenuItemVideoLimit(r.menuItemVideoLimit ?? 1);
      setRestaurantVideoLimit(r.restaurantVideoLimit ?? 2);
    } catch (err) {
      setError(err.message || "Failed to load restaurant");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurantDetails();
  }, [restaurantId]);

  const handleEditSubmit = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem("superAdminToken");

      // ✅ FIX #3: Send correct field names that the backend expects
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: restaurantName,
            contact: restaurantContact,
            menuItemVideoLimit: Number(menuItemVideoLimit),
            restaurantVideoLimit: Number(restaurantVideoLimit),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update restaurant");

      setRestaurant(data.restaurant);
      setIsEditing(false);
    } catch (err) {
      alert(err.message || "Failed to update restaurant");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-gray-400 p-6">Loading restaurant details…</div>
    );
  }

  if (error) {
    return <div className="text-red-400 p-6">{error}</div>;
  }

  if (!restaurant) return null;

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-semibold mb-8">Restaurant Management</h1>

      {/* Info Display */}
      {!isEditing && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
          <InfoRow label="Name" value={restaurant.name} />
          <InfoRow label="Slug" value={restaurant.slug} />
          <InfoRow label="Contact" value={restaurant.contact} />
          <InfoRow
            label="Status"
            value={
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${
                  restaurant.isActive
                    ? "bg-green-700 text-green-100"
                    : "bg-red-700 text-red-100"
                }`}
              >
                {restaurant.isActive ? "Active" : "Inactive"}
              </span>
            }
          />
          <InfoRow
            label="Subscription"
            value={`${restaurant.subscriptionStatus || "—"} / ${restaurant.plan || "—"}`}
          />

          {/* ✅ FIX #2: Show correct field names */}
          <div className="pt-2 border-t border-neutral-800">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Video Limits
            </p>
            <InfoRow
              label="Per-Item Video Limit"
              value={
                <span className="text-blue-300 font-bold">
                  {restaurant.menuItemVideoLimit ?? 1}
                  <span className="text-gray-500 font-normal"> / 10 max</span>
                </span>
              }
            />
            <InfoRow
              label="Restaurant Video Limit"
              value={
                <span className="text-blue-300 font-bold">
                  {restaurant.restaurantVideoLimit ?? 2}
                  <span className="text-gray-500 font-normal"> / 20 max</span>
                </span>
              }
            />
          </div>

          <InfoRow
            label="Created At"
            value={new Date(restaurant.createdAt).toLocaleString()}
          />

          <div className="pt-4 text-center">
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
            >
              Edit Restaurant
            </button>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold mb-2">Edit Restaurant Details</h2>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              placeholder="Restaurant Name"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Contact</label>
            <input
              type="text"
              className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={restaurantContact}
              onChange={(e) => setRestaurantContact(e.target.value)}
              placeholder="Contact (phone or email)"
            />
          </div>

          {/* ✅ FIX #2 + #3: Correct field names in both state and submission */}
          <div className="border-t border-neutral-800 pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
              Video Limits
            </p>

            <div className="mb-3">
              <label className="block text-xs text-gray-400 mb-1">
                Per-Item Video Limit (0–10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={menuItemVideoLimit}
                onChange={(e) => setMenuItemVideoLimit(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Max videos the admin can upload per menu item
              </p>
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Restaurant Video Limit (0–20)
              </label>
              <input
                type="number"
                min="0"
                max="20"
                className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={restaurantVideoLimit}
                onChange={(e) => setRestaurantVideoLimit(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total videos allowed across the whole restaurant
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setIsEditing(false);
                // Reset to current saved values on cancel
                setRestaurantName(restaurant.name || "");
                setRestaurantContact(restaurant.contact || "");
                setMenuItemVideoLimit(restaurant.menuItemVideoLimit ?? 1);
                setRestaurantVideoLimit(restaurant.restaurantVideoLimit ?? 2);
              }}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition"
            >
              Cancel
            </button>
            <button
              onClick={handleEditSubmit}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white disabled:opacity-50 transition"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-neutral-800 py-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-medium text-sm">{value || "—"}</span>
    </div>
  );
}