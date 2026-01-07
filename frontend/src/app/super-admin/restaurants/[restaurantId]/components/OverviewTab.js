"use client";

import { useEffect, useState } from "react";

function Info({ label, value }) {
  return (
    <div className="flex justify-between border-b border-neutral-800 py-2">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium">{value || "—"}</span>
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

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load restaurant");

        const found = data.restaurants.find(
          (r) => r._id === restaurantId
        );

        if (!found) {
          throw new Error("Restaurant not found");
        }

        setRestaurant(found);
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

  return (
    <div className="max-w-xl space-y-4 bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <Info label="Name" value={restaurant.name} />
      <Info label="Slug" value={restaurant.slug} />
      <Info label="Contact" value={restaurant.contact} />
      <Info label="Status" value={restaurant.status || "ACTIVE"} />
      <Info
        label="Created"
        value={new Date(restaurant.createdAt).toLocaleString()}
      />
    </div>
  );
}
