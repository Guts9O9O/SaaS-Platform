"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

// ── Limits (must match backend) ───────────────────────────────────────────────
const IMAGE_MAX_MB = 5;
const VIDEO_MAX_MB = 50;
const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024;
const VIDEO_MAX_BYTES = VIDEO_MAX_MB * 1024 * 1024;

// ── Stable FieldInput ─────────────────────────────────────────────────────────
function FieldInput({ label, type = "text", placeholder, value, onChange, required, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>
          {label}
          {required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
          {hint && <span style={{ color: "#4a4540", fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: 6 }}>{hint}</span>}
        </label>
      )}
      <input
        type={type} placeholder={placeholder} value={value} onChange={onChange}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: `1px solid ${focused ? "rgba(201,168,76,0.4)" : "rgba(245,240,232,0.08)"}`, borderRadius: 12, color: "#f5f0e8", fontSize: 14, fontFamily: "'DM Sans',sans-serif", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
      />
    </div>
  );
}

// ── Upload field with clear button ────────────────────────────────────────────
function UploadField({ label, required, hint, accept, inputId, file, existingUrl, onFileChange, onClear, icon, limitLabel }) {
  const hasFile = !!file;
  const hasExisting = !!existingUrl && !hasFile;
  const hasAny = hasFile || hasExisting;
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>
        {label}
        {required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
        {hint && <span style={{ color: "#4a4540", fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: 6 }}>{hint}</span>}
        {limitLabel && <span style={{ color: "#4a4540", fontWeight: 400, letterSpacing: 0, textTransform: "none", marginLeft: 6 }}>· Max {limitLabel}</span>}
      </label>
      <input type="file" accept={accept} id={inputId} style={{ display: "none" }}
        onChange={e => onFileChange(e.target.files?.[0] || null)}
      />
      {hasAny ? (
        /* File chosen — show name + clear button */
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 12 }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span style={{ flex: 1, fontSize: 13, color: "#c9a84c", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {hasFile ? file.name : "Uploaded ✓"}
          </span>
          {/* Change link */}
          <label htmlFor={inputId} style={{ fontSize: 12, color: "#8a8070", cursor: "pointer", textDecoration: "underline", flexShrink: 0 }}>Change</label>
          {/* Clear / Remove ✕ */}
          <button
            type="button"
            onClick={onClear}
            title="Remove"
            style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, lineHeight: 1 }}
          >✕</button>
        </div>
      ) : (
        /* Empty state — click to upload */
        <label htmlFor={inputId} className="mn-upload"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px", background: "rgba(255,255,255,0.02)", border: "2px dashed rgba(245,240,232,0.08)", borderRadius: 12, color: "#8a8070", fontSize: 13, cursor: "pointer" }}>
          <span style={{ fontSize: 16 }}>{icon}</span>
          <span>Upload {label}</span>
        </label>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, subtitle, onClose, onSubmit, submitLabel, submitting, children }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
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
}

// ── Initial form states ───────────────────────────────────────────────────────
const INIT_CAT  = { name: "", isActive: true };
const INIT_ITEM = { categoryId: "", name: "", description: "", price: "", prepTime: "", imageFile: null, videoFile: null, isAvailable: true, isVeg: true };

export default function AdminMenuPage() {
  const [mounted, setMounted]           = useState(false);
  const [token, setToken]               = useState(null);
  const [restaurantId, setRestaurantId] = useState(null);
  const [authHeaders, setAuthHeaders]   = useState({});
  const [categories, setCategories]     = useState([]);
  const [items, setItems]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState("categories");
  // modals
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal]         = useState(false);
  const [editCatTarget, setEditCatTarget]         = useState(null);
  const [editItemTarget, setEditItemTarget]       = useState(null);
  // forms
  const [categoryForm, setCategoryForm] = useState(INIT_CAT);
  const [itemForm, setItemForm]         = useState(INIT_ITEM);
  const [submitting, setSubmitting]     = useState(false);
  // filters
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterType, setFilterType]         = useState("ALL");
  const [filterAvail, setFilterAvail]       = useState("ALL");
  const [searchQuery, setSearchQuery]       = useState("");
  // existing media (for edit mode)
  const [existingImage, setExistingImage] = useState(""); // url string
  const [existingVideo, setExistingVideo] = useState(""); // url string

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

  const fetchCategories = useCallback(async () => {
    try {
      setError(null); setLoading(true);
      const res  = await fetch(`${API}/api/admin/menu/categories${restaurantId ? `?restaurantId=${restaurantId}` : ""}`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { window.location.href = "/admin/login"; return; }
      if (!res.ok) throw new Error(data?.message || "Failed to load categories");
      setCategories(data.categories || []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [API, restaurantId, authHeaders]);

  const fetchItems = useCallback(async () => {
    try {
      setError(null);
      const res  = await fetch(`${API}/api/admin/menu/items${restaurantId ? `?restaurantId=${restaurantId}` : ""}`, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load items");
      setItems(data.items || []);
    } catch (e) { setError(e.message); }
  }, [API, restaurantId, authHeaders]);

  // ── Category CRUD ─────────────────────────────────────────────────────────
  const createCategory = async () => {
    if (!categoryForm.name.trim()) return;
    try {
      setSubmitting(true);
      const res  = await fetch(`${API}/api/admin/menu/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: categoryForm.name, order: 0, isActive: !!categoryForm.isActive, ...(restaurantId ? { restaurantId } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create category");
      setCategoryForm(INIT_CAT); setShowCategoryModal(false); fetchCategories();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const updateCategory = async () => {
    if (!categoryForm.name.trim() || !editCatTarget) return;
    try {
      setSubmitting(true);
      const res  = await fetch(`${API}/api/admin/menu/categories/${editCatTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ name: categoryForm.name, isActive: !!categoryForm.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update category");
      setEditCatTarget(null); setCategoryForm(INIT_CAT); setShowCategoryModal(false); fetchCategories();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const deleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res  = await fetch(`${API}/api/admin/menu/categories/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      fetchCategories();
    } catch (e) { alert(e.message); }
  };

  // ── File size validation ──────────────────────────────────────────────────
  const validateImageFile = (file) => {
    if (!file) return null;
    if (file.size > IMAGE_MAX_BYTES) {
      alert(`Image is too large. Maximum size is ${IMAGE_MAX_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return null;
    }
    return file;
  };

  const validateVideoFile = (file) => {
    if (!file) return null;
    if (file.size > VIDEO_MAX_BYTES) {
      alert(`Video is too large. Maximum size is ${VIDEO_MAX_MB}MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`);
      return null;
    }
    return file;
  };

  // ── Item CRUD ─────────────────────────────────────────────────────────────
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const res  = await fetch(`${API}/api/admin/upload/menu-image`, { method: "POST", headers: authHeaders, body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Image upload failed");
    return data.imageUrl;
  };

  const uploadVideo = async (itemId, file) => {
    const formData = new FormData();
    formData.append("video", file);
    const res  = await fetch(`${API}/api/admin/menu/items/${itemId}/upload-video`, { method: "POST", headers: authHeaders, body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Video upload failed");
    return data.videoUrl || null;
  };

  const createItem = async () => {
    if (!itemForm.name.trim() || !Number(itemForm.price)) { alert("Please fill in item name and price"); return; }
    if (!itemForm.imageFile) { alert("Please upload an image"); return; }
    try {
      setSubmitting(true);
      const uploadedImageUrl = await uploadImage(itemForm.imageFile);
      const res  = await fetch(`${API}/api/admin/menu/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          categoryId: itemForm.categoryId || null,
          name: itemForm.name,
          description: itemForm.description || "",
          price: Number(itemForm.price),
          prepTime: itemForm.prepTime || "",
          images: uploadedImageUrl ? [uploadedImageUrl] : [],
          isActive: itemForm.isAvailable === true,
          isVeg: Boolean(itemForm.isVeg),
          ...(restaurantId ? { restaurantId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create item");
      const createdItemId = data?.item?._id;
      if (!createdItemId) throw new Error("Item created but itemId missing in response");
      if (itemForm.videoFile) await uploadVideo(createdItemId, itemForm.videoFile);
      setItemForm(INIT_ITEM); setExistingImage(""); setExistingVideo("");
      setShowItemModal(false); fetchItems();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const updateItem = async () => {
    if (!itemForm.name.trim() || !Number(itemForm.price)) { alert("Please fill in item name and price"); return; }
    if (!itemForm.imageFile && !existingImage) { alert("Please upload an image"); return; }
    try {
      setSubmitting(true);
      let uploadedImageUrl = existingImage || "";
      if (itemForm.imageFile) uploadedImageUrl = await uploadImage(itemForm.imageFile);
      const res  = await fetch(`${API}/api/admin/menu/items/${editItemTarget._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          categoryId: itemForm.categoryId || null,
          name: itemForm.name,
          description: itemForm.description || "",
          price: Number(itemForm.price),
          prepTime: itemForm.prepTime || "",
          images: uploadedImageUrl ? [uploadedImageUrl] : [],
          isActive: itemForm.isAvailable === true,
          isVeg: itemForm.isVeg === true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update item");
      if (itemForm.videoFile) await uploadVideo(editItemTarget._id, itemForm.videoFile);
      setEditItemTarget(null); setItemForm(INIT_ITEM); setExistingImage(""); setExistingVideo("");
      setShowItemModal(false); fetchItems();
    } catch (e) { alert(e.message); } finally { setSubmitting(false); }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    try {
      const res  = await fetch(`${API}/api/admin/menu/items/${id}`, { method: "DELETE", headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete");
      fetchItems();
    } catch (e) { alert(e.message); }
  };

  // ── Open modals ───────────────────────────────────────────────────────────
  const openEditCategory = (cat) => {
    setEditCatTarget(cat);
    setCategoryForm({ name: cat.name, isActive: cat.isActive });
    setShowCategoryModal(true);
  };

  const openEditItem = (item) => {
    setEditItemTarget(item);
    setExistingImage(item.images?.[0] || "");
    setExistingVideo(item.videos?.[0] || "");
    setItemForm({
      categoryId: item.categoryId || item.category?._id || "",
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      prepTime: item.prepTime || "",
      imageFile: null,
      videoFile: null,
      isAvailable: item.isActive !== false,
      isVeg: item.isVeg === true,
    });
    setShowItemModal(true);
  };

  const openAddCategory = () => { setEditCatTarget(null); setCategoryForm(INIT_CAT); setShowCategoryModal(true); };
  const openAddItem     = () => {
    setEditItemTarget(null);
    setExistingImage("");
    setExistingVideo("");
    setItemForm(INIT_ITEM);
    setShowItemModal(true);
  };

  // ── Filtered items ────────────────────────────────────────────────────────
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (filterCategory !== "ALL" && (item.categoryId || item.category?._id) !== filterCategory) return false;
      if (filterType === "veg"    && item.isVeg !== true)  return false;
      if (filterType === "nonveg" && item.isVeg !== false) return false;
      const avail = item.isActive !== false;
      if (filterAvail === "available"   && !avail) return false;
      if (filterAvail === "unavailable" && avail)  return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!item.name?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filterCategory, filterType, filterAvail, searchQuery]);

  const getCategoryName = (item) => {
    if (item.category?.name) return item.category.name;
    const cat = categories.find(c => c._id === (item.categoryId || item.category?._id));
    return cat?.name || "—";
  };

  if (!mounted) return null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp  { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes spin    { to { transform:rotate(360deg); } }
        .mn-tab    { transition: all 0.2s; cursor: pointer; border: none; font-family: inherit; }
        .mn-card   { transition: border-color 0.2s, transform 0.2s; }
        .mn-card:hover { border-color: rgba(201,168,76,0.25) !important; transform: translateY(-1px); }
        .mn-row    { transition: background 0.15s; }
        .mn-row:hover { background: rgba(245,240,232,0.02) !important; }
        .mn-btn    { transition: all 0.2s; font-family: inherit; }
        .mn-btn:hover { opacity: 0.85; transform: translateY(-1px); }
        .mn-upload { transition: all 0.2s; cursor: pointer; }
        .mn-upload:hover { border-color: rgba(201,168,76,0.4) !important; background: rgba(201,168,76,0.04) !important; }
        .mn-select { transition: border-color 0.2s; }
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
            { label: "Active Cats", value: categories.filter(c => c.isActive).length, icon: "✅" },
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

        {/* ── CATEGORIES TAB ── */}
        {loading && activeTab === "categories" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "#8a8070", padding: "60px 0", justifyContent: "center" }}>
            <svg style={{ animation: "spin 0.8s linear infinite" }} width="18" height="18" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
            Loading menu...
          </div>
        ) : activeTab === "categories" ? (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button className="mn-btn" onClick={openAddCategory}
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
                <button className="mn-btn" onClick={openAddCategory} style={{ padding: "10px 24px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Create First Category</button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
                {categories.map((cat, i) => (
                  <div key={cat._id} className="mn-card" style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "18px 20px", animation: `fadeUp 0.3s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📂</div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>{cat.name}</p>
                      </div>
                      <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: cat.isActive ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${cat.isActive ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`, color: cat.isActive ? "#10b981" : "#ef4444" }}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="mn-btn" onClick={() => openEditCategory(cat)}
                        style={{ flex: 1, padding: "8px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 10, color: "#c9a84c", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        Edit
                      </button>
                      <button className="mn-btn" onClick={() => deleteCategory(cat._id)}
                        style={{ flex: 1, padding: "8px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#f87171", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* ── ITEMS TAB ── */
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
              <button className="mn-btn" onClick={openAddItem}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 20px", background: "#c9a84c", color: "#0e0e0e", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Menu Item
              </button>
            </div>

            {/* FILTER BAR */}
            {items.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, padding: "14px 16px", background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 14 }}>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search items..."
                  style={{ flex: "1 1 160px", minWidth: 140, padding: "8px 12px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 10, color: "#f5f0e8", fontSize: 13, fontFamily: "inherit", outline: "none" }} />
                <select className="mn-select" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
                  style={{ flex: "1 1 140px", minWidth: 130, padding: "8px 12px", background: "#0e0e0e", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 10, color: filterCategory === "ALL" ? "#8a8070" : "#f5f0e8", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="ALL">All Categories</option>
                  {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
                </select>
                <select className="mn-select" value={filterType} onChange={e => setFilterType(e.target.value)}
                  style={{ flex: "1 1 120px", minWidth: 110, padding: "8px 12px", background: "#0e0e0e", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 10, color: filterType === "ALL" ? "#8a8070" : "#f5f0e8", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="ALL">Veg &amp; Non-Veg</option>
                  <option value="veg">Veg Only</option>
                  <option value="nonveg">Non-Veg Only</option>
                </select>
                <select className="mn-select" value={filterAvail} onChange={e => setFilterAvail(e.target.value)}
                  style={{ flex: "1 1 130px", minWidth: 120, padding: "8px 12px", background: "#0e0e0e", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 10, color: filterAvail === "ALL" ? "#8a8070" : "#f5f0e8", fontSize: 13, fontFamily: "inherit", cursor: "pointer" }}>
                  <option value="ALL">All Availability</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
                {(filterCategory !== "ALL" || filterType !== "ALL" || filterAvail !== "ALL" || searchQuery) && (
                  <button onClick={() => { setFilterCategory("ALL"); setFilterType("ALL"); setFilterAvail("ALL"); setSearchQuery(""); }}
                    style={{ padding: "8px 14px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 10, color: "#f87171", fontSize: 12, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>
                    Clear
                  </button>
                )}
              </div>
            )}

            {items.length === 0 ? (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "60px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>🍽️</div>
                <p style={{ color: "#f5f0e8", fontWeight: 600, fontSize: 16, marginBottom: 8 }}>No items yet</p>
                <p style={{ color: "#8a8070", fontSize: 13 }}>Add your first menu item</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
                <p style={{ color: "#8a8070", fontSize: 14 }}>No items match the current filters.</p>
              </div>
            ) : (
              <div style={{ background: "#161410", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 16, overflow: "hidden" }}>
                {/* Table header — now 7 columns (added Prep Time) */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 110px 80px 80px 90px 100px 90px", gap: 12, padding: "12px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(245,240,232,0.06)" }}>
                  {["Item", "Category", "Type", "Prep", "Price", "Availability", ""].map(h => (
                    <span key={h} style={{ fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 0.8, textTransform: "uppercase" }}>{h}</span>
                  ))}
                </div>
                {filteredItems.map((item, i) => {
                  const isVeg  = item.isVeg === true;
                  const avail  = item.isActive !== false;
                  const catName = getCategoryName(item);
                  return (
                    <div key={item._id} className="mn-row"
                      style={{ display: "grid", gridTemplateColumns: "2fr 110px 80px 80px 90px 100px 90px", gap: 12, padding: "14px 20px", borderBottom: i < filteredItems.length - 1 ? "1px solid rgba(245,240,232,0.05)" : "none", alignItems: "center" }}>
                      {/* Name + description */}
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#f5f0e8", margin: 0 }}>{item.name}</p>
                        {item.description && <p style={{ fontSize: 12, color: "#8a8070", margin: "2px 0 0" }}>{item.description}</p>}
                      </div>
                      {/* Category */}
                      <span style={{ fontSize: 12, color: "#c9a84c", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 8, padding: "3px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{catName}</span>
                      {/* Veg / Non-veg */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 18, height: 18, borderRadius: 3, border: `2px solid ${isVeg ? "#10b981" : "#ef4444"}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isVeg ? "#10b981" : "#ef4444" }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#8a8070" }}>{isVeg ? "Veg" : "Non-Veg"}</span>
                      </div>
                      {/* Prep Time — static display */}
                      <span style={{ fontSize: 12, color: item.prepTime ? "#c8bfb0" : "#4a4540" }}>
                        {item.prepTime ? `⏱ ${item.prepTime}` : "—"}
                      </span>
                      {/* Price */}
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#c9a84c" }}>₹{item.price}</span>
                      {/* ✅ Availability — static badge only, NO toggle button */}
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: avail ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", border: `1px solid ${avail ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.25)"}`, color: avail ? "#10b981" : "#ef4444" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", flexShrink: 0 }} />
                        {avail ? "Available" : "Unavailable"}
                      </span>
                      {/* Edit + Delete */}
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="mn-btn" onClick={() => openEditItem(item)}
                          style={{ padding: "6px 10px", background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)", borderRadius: 8, color: "#c9a84c", cursor: "pointer" }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button className="mn-btn" onClick={() => deleteItem(item._id)}
                          style={{ padding: "6px 10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8, color: "#f87171", cursor: "pointer" }}>
                          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── CATEGORY MODAL ── */}
      {showCategoryModal && (
        <Modal
          title={editCatTarget ? "Edit Category" : "Add Category"}
          subtitle={editCatTarget ? `Editing "${editCatTarget.name}"` : "Create a new menu section"}
          onClose={() => { setShowCategoryModal(false); setEditCatTarget(null); setCategoryForm(INIT_CAT); }}
          onSubmit={editCatTarget ? updateCategory : createCategory}
          submitLabel={editCatTarget ? "Save Changes" : "Create Category"}
          submitting={submitting}
        >
          <FieldInput label="Category Name" placeholder="e.g. Starters, Main Course..." value={categoryForm.name}
            onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} required />
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={categoryForm.isActive} onChange={e => setCategoryForm(p => ({ ...p, isActive: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#c9a84c" }} />
            <span style={{ fontSize: 14, color: "#c8bfb0" }}>Active (visible on menu)</span>
          </label>
        </Modal>
      )}

      {/* ── ITEM MODAL ── */}
      {showItemModal && (
        <Modal
          title={editItemTarget ? "Edit Menu Item" : "Add Menu Item"}
          subtitle={editItemTarget ? `Editing "${editItemTarget.name}"` : "Add a new dish to your menu"}
          onClose={() => { setShowItemModal(false); setEditItemTarget(null); setItemForm(INIT_ITEM); setExistingImage(""); setExistingVideo(""); }}
          onSubmit={editItemTarget ? updateItem : createItem}
          submitLabel={editItemTarget ? "Save Changes" : "Create Item"}
          submitting={submitting}
        >
          {/* Category */}
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#8a8070", letterSpacing: 1, textTransform: "uppercase", marginBottom: 7 }}>Category</label>
            <select className="mn-select" value={itemForm.categoryId} onChange={e => setItemForm(p => ({ ...p, categoryId: e.target.value }))}
              style={{ width: "100%", padding: "12px 14px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(245,240,232,0.08)", borderRadius: 12, color: itemForm.categoryId ? "#f5f0e8" : "#8a8070", fontSize: 14, fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat._id} value={cat._id}>{cat.name}</option>)}
            </select>
          </div>

          <FieldInput label="Item Name" placeholder="e.g. Butter Chicken" value={itemForm.name}
            onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} required />
          <FieldInput label="Description" placeholder="Brief description (optional)" value={itemForm.description}
            onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))} />

          {/* Price + Prep Time side by side */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FieldInput label="Price (₹)" type="number" placeholder="Enter price" value={itemForm.price}
              onChange={e => setItemForm(p => ({ ...p, price: e.target.value }))} required />
            <FieldInput label="Prep Time" placeholder="e.g. 15 mins" value={itemForm.prepTime}
              onChange={e => setItemForm(p => ({ ...p, prepTime: e.target.value }))}
              hint="(optional)" />
          </div>

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

          {/* ✅ Image upload with clear + size limit */}
          <UploadField
            label="Image" required
            limitLabel={`${IMAGE_MAX_MB}MB`}
            accept="image/*"
            inputId="img-upload"
            icon="🖼️"
            file={itemForm.imageFile}
            existingUrl={existingImage}
            onFileChange={(file) => {
              const validated = validateImageFile(file);
              setItemForm(p => ({ ...p, imageFile: validated }));
            }}
            onClear={() => {
              setItemForm(p => ({ ...p, imageFile: null }));
              setExistingImage("");
              // Reset input so same file can be re-selected
              const el = document.getElementById("img-upload");
              if (el) el.value = "";
            }}
          />

          {/* ✅ Video upload with clear + size limit */}
          <UploadField
            label="Video"
            hint="(optional)"
            limitLabel={`${VIDEO_MAX_MB}MB`}
            accept="video/*"
            inputId="vid-upload"
            icon="🎬"
            file={itemForm.videoFile}
            existingUrl={existingVideo}
            onFileChange={(file) => {
              const validated = validateVideoFile(file);
              setItemForm(p => ({ ...p, videoFile: validated }));
            }}
            onClear={() => {
              setItemForm(p => ({ ...p, videoFile: null }));
              setExistingVideo("");
              const el = document.getElementById("vid-upload");
              if (el) el.value = "";
            }}
          />

          {/* Available checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(245,240,232,0.07)", borderRadius: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={itemForm.isAvailable} onChange={e => setItemForm(p => ({ ...p, isAvailable: e.target.checked }))} style={{ width: 16, height: 16, accentColor: "#c9a84c" }} />
            <span style={{ fontSize: 14, color: "#c8bfb0" }}>Available (show on menu)</span>
          </label>
        </Modal>
      )}
    </>
  );
}