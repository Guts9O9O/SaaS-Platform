"use client";

import { useEffect, useState } from "react";

const PLANS = ["FREE", "BASIC", "PRO"];
const STATUSES = ["TRIAL", "ACTIVE", "SUSPENDED"];

export default function SubscriptionTab({ restaurantId }) {
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  /* ---------------- FETCH CURRENT SUBSCRIPTION ---------------- */
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
        if (!res.ok) throw new Error(data.message || "Failed to load data");

        const restaurant = data.restaurants.find(
          (r) => r._id === restaurantId
        );

        if (!restaurant) throw new Error("Restaurant not found");

        setPlan(restaurant.plan || "FREE");
        setStatus(restaurant.subscriptionStatus || "TRIAL");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [restaurantId]);

  /* ---------------- SAVE SUBSCRIPTION ---------------- */
  const saveSubscription = async () => {
    setSaving(true);
    setError(null);

    try {
      const token = localStorage.getItem("superAdminToken");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/super-admin/restaurants/${restaurantId}/subscription`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            plan,
            subscriptionStatus: status,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      alert("Subscription updated successfully");
    } catch (err) {
      alert(err.message || "Failed to update subscription");
    } finally {
      setSaving(false);
    }
  };

  /* ---------------- UI ---------------- */
  if (loading) return <div className="text-gray-400">Loading subscription…</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="max-w-xl space-y-6 bg-neutral-900 border border-neutral-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold">Subscription Settings</h3>

      {/* PLAN */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">Plan</label>
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* STATUS */}
      <div>
        <label className="block text-sm text-gray-400 mb-1">
          Subscription Status
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full p-2 rounded bg-neutral-800 border border-neutral-700"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={saveSubscription}
        disabled={saving}
        className="px-4 py-2 rounded bg-green-700 hover:bg-green-600 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Changes"}
      </button>
    </div>
  );
}
