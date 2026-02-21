"use client";
import { useEffect, useState } from "react";

function Info({ label, value }) {
  return (
    <div className="flex justify-between items-center border-b border-neutral-800 py-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="font-medium text-sm">{value ?? "—"}</span>
    </div>
  );
}

export default function OverviewTab({ restaurantId }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const token = localStorage.getItem("superAdminToken");
        if (!token) {
          setError("You must be logged in to view this data.");
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load restaurant");
        setRestaurant(data.restaurant);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  if (loading) return <div className="text-gray-400">Loading overview…</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!restaurant) return null;

  return (
    <div className="max-w-xl space-y-1 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      {/* General Info */}
      <Info label="Name" value={restaurant.name} />
      <Info label="Slug" value={restaurant.slug} />
      <Info label="Contact" value={restaurant.contact} />
      <Info
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
      <Info
        label="Subscription"
        value={`${restaurant.subscriptionStatus || "TRIAL"} / ${restaurant.plan || "FREE"}`}
      />
      <Info
        label="Created"
        value={new Date(restaurant.createdAt).toLocaleString()}
      />

      {/* ✅ FIX #8: Video limits now shown in OverviewTab */}
      <div className="pt-3 mt-2">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Video Limits
        </p>
        <Info
          label="Per-Item Video Limit"
          value={
            <span className="text-blue-300 font-bold">
              {restaurant.menuItemVideoLimit ?? 1}
              <span className="text-gray-500 font-normal text-xs"> / 10 max</span>
            </span>
          }
        />
        <Info
          label="Restaurant Video Limit"
          value={
            <span className="text-blue-300 font-bold">
              {restaurant.restaurantVideoLimit ?? 2}
              <span className="text-gray-500 font-normal text-xs"> / 20 max</span>
            </span>
          }
        />
      </div>
    </div>
  );
}