"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL;

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("superAdminToken") : null;
}
async function apiFetch(url, options = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

const EMPTY_FORM = {
  name: "", contact: "", slug: "", plan: "FREE", subscriptionStatus: "TRIAL",
  menuItemVideoLimit: 1, restaurantVideoLimit: 2,
  adminName: "", adminEmail: "", adminPhone: "", adminPassword: "",
};

export default function SuperAdminRestaurantsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [showCreate, setShowCreate]   = useState(false);
  const [creating, setCreating]       = useState(false);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [deletingId, setDeletingId]   = useState(null);
  // Logo for onboarding
  const [logoFile, setLogoFile]       = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef                  = useRef(null);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const fetchRestaurants = async () => {
    try {
      setLoading(true); setError(null);
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants`);
      if (res.status === 401) return router.replace("/super-admin/login");
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load");
      setRestaurants(data.restaurants || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file."); return; }
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB."); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const createRestaurant = async () => {
    if (!form.name.trim() || !form.contact.trim()) return;
    setCreating(true);
    try {
      // Step 1: Create restaurant
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants`, {
        method: "POST",
        body: JSON.stringify({
          name: form.name.trim(), contact: form.contact.trim(),
          slug: form.slug.trim() || undefined, plan: form.plan,
          subscriptionStatus: form.subscriptionStatus,
          menuItemVideoLimit: Number(form.menuItemVideoLimit),
          restaurantVideoLimit: Number(form.restaurantVideoLimit),
          adminName: form.adminName.trim() || undefined,
          adminEmail: form.adminEmail.trim() || undefined,
          adminPhone: form.adminPhone.trim() || undefined,
          adminPassword: form.adminPassword || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create");

      // Step 2: Upload logo if selected
      if (logoFile && data.restaurant?._id) {
        const formData = new FormData();
        formData.append("logo", logoFile);
        formData.append("restaurantId", data.restaurant._id);
        await fetch(`${API}/api/admin/upload/restaurant-logo`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
          body: formData,
        });
      }

      setForm(EMPTY_FORM); setLogoFile(null); setLogoPreview(null);
      setShowCreate(false);
      fetchRestaurants();
    } catch (err) {
      alert(err.message || "Failed to create restaurant");
    } finally { setCreating(false); }
  };

  const deleteRestaurant = async (id) => {
    if (!window.confirm("Delete this restaurant? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      const res = await apiFetch(`${API}/api/admin/super-admin/restaurants/${id}`, { method: "DELETE" });
      if (res.status === 401) return router.replace("/super-admin/login");
      fetchRestaurants();
    } catch (err) { alert(err.message || "Failed to delete"); }
    finally { setDeletingId(null); }
  };

  if (loading) return <div className="text-gray-400 p-6">Loading restaurants…</div>;
  if (error)   return <div className="text-red-400 p-6">{error}</div>;

  return (
    <div className="text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Restaurants</h1>
        <button onClick={() => setShowCreate(true)}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">
          + Onboard Restaurant
        </button>
      </div>

      {/* Table */}
      <div className="border border-neutral-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-gray-400">
            <tr>
              <th className="p-4 text-left">Logo</th>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Slug</th>
              <th className="p-4 text-left">Plan</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Item Vids</th>
              <th className="p-4 text-left">Rest. Vids</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => {
              const logoSrc = r.logoUrl ? (r.logoUrl.startsWith("http") ? r.logoUrl : `${API}${r.logoUrl}`) : null;
              return (
                <tr key={r._id} className="border-t border-neutral-800 hover:bg-neutral-900 transition">
                  <td className="p-4">
                    <div className="w-9 h-9 rounded-lg border border-neutral-700 bg-neutral-800 flex items-center justify-center overflow-hidden">
                      {logoSrc
                        ? <img src={logoSrc} alt="logo" className="w-full h-full object-contain" />
                        : <span className="text-lg">🍽️</span>}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{r.name}</td>
                  <td className="p-4 text-gray-400">{r.slug}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 rounded text-xs bg-neutral-700 text-gray-200">{r.plan || "FREE"}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      r.subscriptionStatus === "ACTIVE" ? "bg-green-700 text-green-100" :
                      r.subscriptionStatus === "SUSPENDED" ? "bg-red-700 text-red-100" : "bg-yellow-700 text-yellow-100"
                    }`}>{r.subscriptionStatus || "TRIAL"}</span>
                  </td>
                  <td className="p-4 text-center text-gray-300">{r.menuItemVideoLimit ?? 1}</td>
                  <td className="p-4 text-center text-gray-300">{r.restaurantVideoLimit ?? 2}</td>
                  <td className="p-4 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button onClick={() => router.push(`/super-admin/restaurants/${r._id}`)}
                        className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs transition">View</button>
                      <button onClick={() => deleteRestaurant(r._id)} disabled={deletingId === r._id}
                        className="px-3 py-1.5 rounded bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs transition disabled:opacity-50">
                        {deletingId === r._id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {restaurants.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-gray-500">No restaurants yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">Onboard New Restaurant</h2>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setLogoFile(null); setLogoPreview(null); }}
                className="text-gray-500 hover:text-white transition text-xl leading-none">✕</button>
            </div>

            <div className="p-6 space-y-6">

              {/* ── LOGO ─────────────────────────────────────────────── */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Restaurant Logo</p>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-xl border border-neutral-700 bg-neutral-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoPreview
                      ? <img src={logoPreview} alt="preview" className="w-full h-full object-contain" />
                      : <span className="text-3xl">🍽️</span>}
                  </div>
                  <div>
                    <p className="text-sm text-gray-300 mb-1">Upload logo <span className="text-gray-600 text-xs">(optional)</span></p>
                    <p className="text-xs text-gray-600 mb-3">PNG, JPG, WebP · Max 2MB · 256×256px recommended</p>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                    <button onClick={() => logoInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white text-xs font-medium transition">
                      {logoPreview ? "Change Logo" : "Choose Logo"}
                    </button>
                    {logoPreview && (
                      <button onClick={() => { setLogoFile(null); setLogoPreview(null); if (logoInputRef.current) logoInputRef.current.value = ""; }}
                        className="ml-2 px-3 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs transition">Remove</button>
                    )}
                  </div>
                </div>
              </section>

              {/* ── RESTAURANT DETAILS ───────────────────────────────── */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Restaurant Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Restaurant Name *</label>
                    <input className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. The Grand Spice" value={form.name} onChange={set("name")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Contact *</label>
                    <input className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Phone or email" value={form.contact} onChange={set("contact")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Slug <span className="text-gray-600">(auto if blank)</span></label>
                    <input className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. the-grand-spice" value={form.slug} onChange={set("slug")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Plan</label>
                    <select className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.plan} onChange={set("plan")}>
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="PRO">PRO</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Subscription Status</label>
                    <select className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.subscriptionStatus} onChange={set("subscriptionStatus")}>
                      <option value="TRIAL">TRIAL</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                    </select>
                  </div>
                </div>
              </section>

              {/* ── VIDEO LIMITS ─────────────────────────────────────── */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Video Limits</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Per-Item Video Limit (0–10)</label>
                    <input type="number" min="0" max="10"
                      className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.menuItemVideoLimit} onChange={set("menuItemVideoLimit")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Restaurant Video Limit (0–20)</label>
                    <input type="number" min="0" max="20"
                      className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.restaurantVideoLimit} onChange={set("restaurantVideoLimit")} />
                  </div>
                </div>
              </section>

              {/* ── ADMIN ACCOUNT ────────────────────────────────────── */}
              <section>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Restaurant Admin Account</p>
                <p className="text-xs text-gray-600 mb-3">Optional — fill in to create a login for the restaurant admin.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Admin Name</label>
                    <input className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g. Ravi Sharma" value={form.adminName} onChange={set("adminName")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Admin Email *</label>
                    <input type="email"
                      className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="admin@restaurant.com" value={form.adminEmail} onChange={set("adminEmail")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Admin Phone (optional)</label>
                    <input type="tel"
                      className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+91 98765 43210" value={form.adminPhone} onChange={set("adminPhone")} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Admin Password *</label>
                    <input type="password"
                      className="w-full p-3 rounded-lg bg-neutral-800 text-white border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Strong password" value={form.adminPassword} onChange={set("adminPassword")} />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-neutral-900 border-t border-neutral-800 px-6 py-4 flex justify-end gap-3">
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setLogoFile(null); setLogoPreview(null); }}
                className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-sm transition">Cancel</button>
              <button onClick={createRestaurant} disabled={creating || !form.name.trim() || !form.contact.trim()}
                className="px-5 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium disabled:opacity-50 transition">
                {creating ? "Creating…" : "Create Restaurant"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}