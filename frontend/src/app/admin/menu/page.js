"use client";
import { useEffect, useState } from "react";
import { getAdminToken } from "@/lib/auth";

function safeDecodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch { return null; }
}

function FieldInput({ label, type = "text", placeholder, value, onChange, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>{label}{required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}</label>}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : "rgba(245,240,232,0.08)"}`, borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }} />
    </div>
  );
}

export default function AdminMenuPage() {
  const [mounted, setMounted] = useState(false);
  const [token, setToken] = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [authHeaders, setAuthHeaders] = useState({});
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: "", order: 0, isActive: true });
  const [itemForm, setItemForm] = useState({ categoryId: "", name: "", description: "", price: "", imageFile: null, videoFile: null, isAvailable: true, isVeg: true });
  const [submitting, setSubmitting] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    setMounted(true);
    const t = getAdminToken();
    if (!t) { window.location.href = "/admin/login"; return; }
    const payload = safeDecodeJwtPayload(t);
    setToken(t);
    setRestaurantId(payload?.restaurantId || null);
    setAuthHeaders({ Authorization: `Bearer ${t}` });
  }, []);

  useEffect(() => { if (mounted && token) fetchCategories(); }, [mounted, token]);
  useEffect(() => { if (mounted && token && activeTab === "items") fetchItems(); }, [activeTab, mounted, token]);

  const fetchCategories = async () => {
    try {
      setError(null); setLoading(true);
      const res = await fetch(`${API}/api/admin/menu/categories${restaurantId ? `?restaurantId=${restaurantId}` : ""}`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      if (!res.ok) throw new Error(data?.message || "Failed to load categories");
      setCategories(data.categories || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };

  const fetchItems = async () => {
    try {
      setError(null);
      const res = await fetch(`${API}/api/admin/menu/items${restaurantId ? `?restaurantId=${restaurantId}` : ""}`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load items");
      setItems(data.items || []);
    } catch (e) { setError(e.message); }
  };

  const createCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      setSubmitting(true);
      const res = await fetch(`${API}/api/admin/menu/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: categoryForm.name, order: Number(categoryForm.order || 0), isActive: !!categoryForm.isActive, ...(restaurantId ? { restaurantId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create category");
      setCategoryForm({ name: "", order: 0, isActive: true });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res = await fetch(`${API}/api/admin/upload/menu-image`, { method: "POST", headers: authHeaders, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Image upload failed");
    return data.imageUrl;
  };

  const uploadVideo = async (itemId, file) => {
    const formData = new FormData();
    formData.append("video", file);
    const res = await fetch(`${API}/api/admin/menu/items/${itemId}/upload-video`, { method: "POST", headers: authHeaders, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Video upload failed");
    return data.videoUrl || null;
  };

  const createItem = async () => {
    if (!itemForm.name.trim() || !Number(itemForm.price)) { alert("Please fill in item name and price"); return; }
    try {
      setSubmitting(true);
      let uploadedImageUrl = "";
      if (itemForm.imageFile) uploadedImageUrl = await uploadImage(itemForm.imageFile);
      const res = await fetch(`${API}/api/admin/menu/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ categoryId: itemForm.categoryId || null, name: itemForm.name, description: itemForm.description || "", price: Number(itemForm.price), images: uploadedImageUrl ? [uploadedImageUrl] : [], isAvailable: !!itemForm.isAvailable, isVeg: Boolean(itemForm.isVeg), ...(restaurantId ? { restaurantId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create item");
      const createdItemId = data?.item?._id;
      if (!createdItemId) throw new Error("Item created but itemId missing in response");
      if (itemForm.videoFile) await uploadVideo(createdItemId, itemForm.videoFile);
      setItemForm({ categoryId: "", name: "", description: "", price: "", imageFile: null, videoFile: null, isAvailable: true, isVeg: true });
      setShowItemModal(false);
      fetchItems();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`${API}/api/admin/menu/categories/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      fetchCategories();
    } catch (e) { alert(e.message); }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res = await fetch(`${API}/api/admin/menu/items/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      fetchItems();
    } catch (e) { alert(e.message); }
  };

  if (!mounted) return null;

  const Modal = ({ title, subtitle, onClose, onSubmit, submitLabel, children }) => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.1)", borderRadius: 20, width: "100%", maxWidth: 460, maxHeight: "90vh", overflow: "auto", boxShadow: "0 40px 80px rgba(0,0,0,0.5)", fontFamily: "'DM Sans',sans-serif", animation: "modalIn 0.3s cubic-bezier(0.16,1,0.3,1)" }}>
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)" }} />
        <div style={{ padding: "26px 28px 16px", position: "sticky", top: 0, background: "#161410", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#f5f0e8", margin: 0 }}>{title}</h2>
              {subtitle && <p style={{ color: "#8a8070", fontSize: 13, margin: "4px 0 0", fontWeight: 300 }}>{subtitle}</p>}
            </div>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(245,240,232,0.08)", color: "#8a8070", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>✕</button>
          </div>
        </div>
        <div style={{ padding: "8px 28px 20px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
        <div style={{ display: "flex", gap: 10, padding: "0 28px 28px", position: "sticky", bottom: 0, background: "#161410" }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          <button onClick={onSubmit} disabled={submitting} style={{ flex: 1, padding: "12px", background: "#c9a84c", border: "none", borderRadius: 12, color: "#0e0e0e", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Saving..." : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin { to { transform:rotate(360deg); } }
        .mn-tab { transition: all 0.2s; cursor: pointer; border: none; font-family: inherit; }
        .mn-card { transition: border-color 0.2s, transform 0.2s; }
        .mn-card:hover { border-color: rgba(201,168,76,0.25) !important; transform: translateY(-1px); }
        .mn-row { transition: background 0.15s; }
        .mn-row:hover { background: rgba(245,240,232,0.02) !important; }
        .mn-btn { transition: all 0.2s; font-family: inherit; }
        .mn-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .mn-upload { transition: all 0.2s; cursor: pointer; }
        .mn-upload:hover { border-color: rgba(201,168,76,0.4) !important; background: rgba(201,168,76,0.04) !important; }
        .mn-select:focus { border-color: rgba(201,168,76,0.4) !important; outline: none; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#0e0e0e", color: "#f5f0e8", padding: "28px 24px", fontFamily: "'DM Sans',sans-serif" }}>

        {/* HEADER */}
        <div style={{ marginBottom: 28, animation: "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1)" }}>
          <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: "#c9a84c", fontWeight: 600, marginBottom: 6 }}>Restaurant Admin</p>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, fontWeight: 700, color: "#f5f0e8", margin: "0 0 6px", letterSpacing: -0.5 }}>Menu Management</h1>
          <p style={{ color: "#8a8070", fontSize: 13, margin: 0, fontWeight: 300 }}>Manage categories and menu items</p>
          <div style={{ height: 1, background: "linear-gradient(90deg, rgba(201,168,76,0.3), transparent)", marginTop: 20 }} />
        </div>

        {/* STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Categories", value: categories.length, icon: "📂" },
            { label: "Menu Items", value: items.length || "—", icon: "🍽️" },
            { label: "Active", value: categories.filter(c => c.isActive).length, icon: "✅" },
          ].map(s => (
            <div key={s.label} style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div>
                <p style={{ fontSize: 22, fontWeight: 700, color: "#c9a84c", margin: 0, fontFamily: "'Playfair Display',serif" }}>{s.value}</p>
                <p style={{ fontSize: 11, color: "#8a8070", margin: 0 }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "inline-flex", gap: 4, padding: 4, background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14, marginBottom: 24 }}>
          {[{ id: "categories", label: "Categories", icon: "📂" }, { id: "items", label: "Menu Items", icon: "🍽️" }].map(tab => (
            <button key={tab.id} className="mn-tab" onClick={() => setActiveTab(tab.id)}
              style={{ padding: "9px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: activeTab === tab.id ? "#c9a84c" : "transparent", color: activeTab === tab.id ? "#0e0e0e" : "#8a8070", display: "flex", alignItems: "center", gap: 6 }}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>

        {/* ERROR */}
        {error && <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

        {/* LOADING */}
        {loading && activeTab === "categories" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a8070", padding: "60px 0", justifyContent: "center" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading menu...
          </div>
        ) : activeTab === "categories" ? (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button className="mn-btn" onClick={() => setShowCategoryModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📂</div>
                <p style={{ color: "#f5f0e8", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No categories yet</p>
                <p style={{ color: "#8a8070", fontSize: 13, marginBottom: 20 }}>Create categories to organise your menu</p>
                <button className="mn-btn" onClick={() => setShowCategoryModal(true)} style={{ padding: "10px 24px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  Create First Category
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {categories.map((cat, i) => (
                  <div key={cat._id} className="mn-card" style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "18px 20px", animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📂</div>
                        <div>
                          <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>{cat.name}</p>
                          <p style={{ fontSize: 11, color: "#8a8070", margin: "2px 0 0" }}>Order: {cat.order ?? 0}</p>
                        </div>
                      </div>
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: cat.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${cat.isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: cat.isActive ? "#10b981" : "#ef4444" }}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <button className="mn-btn" onClick={() => deleteCategory(cat._id)}
                      style={{ width: "100%", padding: "8px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#f87171", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ITEMS TAB */
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button className="mn-btn" onClick={() => setShowItemModal(true)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Menu Item
              </button>
            </div>

            {items.length === 0 ? (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🍽️</div>
                <p style={{ color: "#f5f0e8", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No items yet</p>
                <p style={{ color: "#8a8070", fontSize: 13 }}>Add your first menu item</p>
              </div>
            ) : (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden" }}>
                {/* Header row */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 100px 80px", gap: 16, padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(245,240,232,0.06)" }}>
                  {["Item", "Type", "Price", "Status", ""].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {items.map((item, i) => {
                  const isVeg = item.isVeg === true;
                  const available = item.isAvailable === true || item.isActive === true;
                  return (
                    <div key={item._id} className="mn-row" style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 100px 80px", gap: 16, padding: "14px 20px", borderBottom: i < items.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none", alignItems: "center" }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>{item.name}</p>
                        {item.description && <p style={{ fontSize: 12, color: "#8a8070", margin: "2px 0 0" }}>{item.description}</p>}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${isVeg ? "#10b981" : "#ef4444"}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isVeg ? "#10b981" : "#ef4444" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#8a8070" }}>{isVeg ? "Veg" : "Non-Veg"}</span>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>₹{item.price}</span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: available ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${available ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: available ? "#10b981" : "#ef4444" }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                        {available ? "Available" : "Unavailable"}
                      </span>
                      <button className="mn-btn" onClick={() => deleteItem(item._id)}
                        style={{ padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", cursor: "pointer" }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <Modal title="Add Category" subtitle="Create a new menu section" onClose={() => setShowCategoryModal(false)} onSubmit={createCategory} submitLabel="Create Category">
          <FieldInput label="Category Name" placeholder="e.g. Starters, Main Course..." value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} required />
          <FieldInput label="Display Order" type="number" placeholder="0" value={categoryForm.order} onChange={e => setCategoryForm({ ...categoryForm, order: Number(e.target.value) })} />
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={categoryForm.isActive} onChange={e => setCategoryForm({ ...categoryForm, isActive: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#c9a84c" }} />
            <span style={{ fontSize: 14, color: "#c8bfb0" }}>Active (visible on menu)</span>
          </label>
        </Modal>
      )}

      {/* ITEM MODAL */}
      {showItemModal && (
        <Modal title="Add Menu Item" subtitle="Add a new dish to your menu" onClose={() => setShowItemModal(false)} onSubmit={createItem} submitLabel="Create Item">
          {/* Category select */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Category</label>
            <select className="mn-select" value={itemForm.categoryId} onChange={e => setItemForm({ ...itemForm, categoryId: e.target.value })}
              style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: itemForm.categoryId ? "#f5f0e8" : "#8a8070", fontSize: 14, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>
          <FieldInput label="Item Name" placeholder="e.g. Butter Chicken" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} required />
          <FieldInput label="Description" placeholder="Brief description (optional)" value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} />
          <FieldInput label="Price (₹)" type="number" placeholder="Enter price" value={itemForm.price} onChange={e => setItemForm({ ...itemForm, price: e.target.value })} required />

          {/* Veg / Non-Veg */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Food Type <span style={{ color: "#ef4444" }}>*</span></label>
            <div style={{ display: "flex", gap: 10 }}>
              {[{ val: true, label: "Vegetarian", color: "#10b981" }, { val: false, label: "Non-Veg", color: "#ef4444" }].map(opt => (
                <button key={String(opt.val)} type="button" onClick={() => setItemForm(p => ({ ...p, isVeg: opt.val }))}
                  style={{ flex: 1, padding: "12px", borderRadius: 12, border: `2px solid ${itemForm.isVeg === opt.val ? opt.color : "rgba(245,240,232,0.08)"}`, background: itemForm.isVeg === opt.val ? `${opt.color}12` : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.2s" }}>
                  <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${opt.color}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: opt.color }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: itemForm.isVeg === opt.val ? opt.color : "#8a8070" }}>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Image</label>
            <input type="file" accept="image/*" id="img-upload" style={{ display: "none" }} onChange={e => setItemForm({ ...itemForm, imageFile: e.target.files?.[0] || null })} />
            <label htmlFor="img-upload" className="mn-upload" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 13 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              {itemForm.imageFile ? <span style={{ color: "#c9a84c" }}>{itemForm.imageFile.name}</span> : "Upload Image"}
            </label>
          </div>

          {/* Video upload */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Video <span style={{ color: "#4a4540", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>(optional)</span></label>
            <input type="file" accept="video/*" id="vid-upload" style={{ display: "none" }} onChange={e => setItemForm({ ...itemForm, videoFile: e.target.files?.[0] || null })} />
            <label htmlFor="vid-upload" className="mn-upload" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 13 }}>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              {itemForm.videoFile ? <span style={{ color: "#c9a84c" }}>{itemForm.videoFile.name}</span> : "Upload Video"}
            </label>
          </div>

          {/* Available toggle */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm({ ...itemForm, isAvailable: e.target.checked })} style={{ width: 16, height: 16, accentColor: "#c9a84c" }} />
            <span style={{ fontSize: 14, color: "#c8bfb0" }}>Available (show on menu)</span>
          </label>
        </Modal>
      )}
    </>
  );
}