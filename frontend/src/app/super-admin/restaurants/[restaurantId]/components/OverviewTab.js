"use client";
import { useEffect, useRef, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

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
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [logoUrl, setLogoUrl]       = useState(null);
  const fileInputRef = useRef(null);

  const fetchRestaurant = async () => {
    try {
      const token = localStorage.getItem("superAdminToken");
      if (!token) { setError("You must be logged in to view this data."); return; }
      const res = await fetch(`${API}/api/admin/super-admin/restaurants/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load restaurant");
      setRestaurant(data.restaurant);
      setLogoUrl(data.restaurant.logoUrl || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRestaurant(); }, [restaurantId]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Validate: image only, max 2MB
    if (!file.type.startsWith("image/")) return alert("Please select an image file.");
    if (file.size > 2 * 1024 * 1024) return alert("Image must be under 2MB.");

    setUploading(true);
    try {
      const token = localStorage.getItem("superAdminToken");
      const formData = new FormData();
      formData.append("logo", file);
      formData.append("restaurantId", restaurantId);

      const res = await fetch(`${API}/api/admin/upload/restaurant-logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setLogoUrl(data.logoUrl);
    } catch (err) {
      alert(err.message || "Logo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) return <div className="text-gray-400">Loading overview…</div>;
  if (error)   return <div className="text-red-400">{error}</div>;
  if (!restaurant) return null;

  const fullLogoUrl = logoUrl
    ? logoUrl.startsWith("http") ? logoUrl : `${API}${logoUrl}`
    : null;

  return (
    <div className="max-w-xl space-y-4">

      {/* ── LOGO SECTION ─────────────────────────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Restaurant Logo</p>
        <div className="flex items-center gap-4">
          {/* Preview */}
          <div className="w-20 h-20 rounded-xl border border-neutral-700 bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
            {fullLogoUrl ? (
              <img src={fullLogoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-3xl">🍽️</span>
            )}
          </div>
          {/* Upload controls */}
          <div className="flex-1">
            <p className="text-sm text-gray-300 mb-1 font-medium">
              {fullLogoUrl ? "Change logo" : "Upload logo"}
            </p>
            <p className="text-xs text-gray-500 mb-3">PNG, JPG or WebP · Max 2MB · Recommended 256×256px</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition"
            >
              {uploading ? "Uploading…" : fullLogoUrl ? "Change Logo" : "Upload Logo"}
            </button>
            {fullLogoUrl && (
              <p className="text-xs text-green-400 mt-2">✓ Logo uploaded</p>
            )}
          </div>
        </div>
      </div>

      {/* ── GENERAL INFO ─────────────────────────────────────────────── */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-1">
        <Info label="Name"  value={restaurant.name} />
        <Info label="Slug"  value={restaurant.slug} />
        <Info label="Contact" value={restaurant.contact} />
        <Info label="Status" value={
          <span className={`px-2 py-1 rounded text-xs font-semibold ${restaurant.isActive ? "bg-green-700 text-green-100" : "bg-red-700 text-red-100"}`}>
            {restaurant.isActive ? "Active" : "Inactive"}
          </span>
        } />
        <Info label="Subscription" value={`${restaurant.subscriptionStatus || "TRIAL"} / ${restaurant.plan || "FREE"}`} />
        <Info label="Created" value={new Date(restaurant.createdAt).toLocaleString()} />

        <div className="pt-3 mt-2">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Video Limits</p>
          <Info label="Per-Item Video Limit" value={
            <span className="text-blue-300 font-bold">
              {restaurant.menuItemVideoLimit ?? 1}
              <span className="text-gray-500 font-normal text-xs"> / 10 max</span>
            </span>
          } />
          <Info label="Restaurant Video Limit" value={
            <span className="text-blue-300 font-bold">
              {restaurant.restaurantVideoLimit ?? 2}
              <span className="text-gray-500 font-normal text-xs"> / 20 max</span>
            </span>
          } />
        </div>
      </div>
    </div>
  );
}