
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, X, Upload } from "lucide-react";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminToken") || localStorage.getItem("token");
}

function safeDecodeJwtPayload(token) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export default function AdminMenuPage() {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    order: 0,
    isActive: true,
  });

  const [itemForm, setItemForm] = useState({
  categoryId: "",
  name: "",
  description: "",
  price: "",
  imageFile: null,
  videoFile: null,   
  imageUrl: "",
  isAvailable: true,
  isVeg: true,
});

  useEffect(() => {
    setMounted(true);
  }, []);

  const { token, restaurantId } = useMemo(() => {
    const t = getToken();
    const payload = t ? safeDecodeJwtPayload(t) : null;
    return { token: t, restaurantId: payload?.restaurantId || null };
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      if (typeof window !== "undefined") {
        window.location.href = "/admin/login";
      }
      return;
    }
    fetchCategories();
  }, [mounted, token]);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const fetchCategories = async () => {
    try {
      setError(null);
      setLoading(true);

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories${
        restaurantId ? `?restaurantId=${restaurantId}` : ""
      }`;

      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load categories");

      setCategories(data.categories || []);
    } catch (e) {
      setError(e.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      setError(null);

      const params = [];
      if (restaurantId) params.push(`restaurantId=${restaurantId}`);

      const url = `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items${
        params.length ? `?${params.join("&")}` : ""
      }`;

      const res = await fetch(url, { headers: authHeaders });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load items");

      // ✅ Debug: Log fetched items to check isVeg field
      console.log("Fetched items:", data.items);
      data.items?.forEach(item => {
        console.log(`Item: ${item.name}, isVeg: ${item.isVeg}, veg: ${item.veg}`);
      });

      setItems(data.items || []);
    } catch (e) {
      console.error("Error fetching items:", e);
      setError(e.message || "Failed to load items");
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (activeTab === "items") {
      fetchItems();
    }
  }, [activeTab, mounted]);

  const createCategory = async () => {
    if (!categoryForm.name.trim()) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          name: categoryForm.name,
          order: Number(categoryForm.order || 0),
          isActive: !!categoryForm.isActive,
          ...(restaurantId ? { restaurantId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create category");

      setCategoryForm({ name: "", order: 0, isActive: true });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (e) {
      alert(e.message || "Failed to create category");
    }
  };

  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/upload/menu-image`,
      {
        method: "POST",
        headers: authHeaders,
        body: formData,
      }
    );

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Image upload failed");

    return data.imageUrl;
  };

  const uploadVideo = async (itemId, file) => {
  const formData = new FormData();
  formData.append("video", file);

  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items/${itemId}/upload-video${restaurantId ? `?restaurantId=${restaurantId}` : ""}`,
    {
      method: "POST",
      headers: authHeaders, // ✅ DON'T set Content-Type for FormData
      body: formData,
    }
  );

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "Video upload failed");

  return data.videoUrl; // backend returns { videoUrl, item }
};

  // ✅ UPDATED: Added isVeg to payload
  const createItem = async () => {
  if (!itemForm.name.trim() || !Number(itemForm.price)) {
    alert("Please fill in item name and price");
    return;
  }

  try {
    let uploadedImageUrl = "";

    // 1) Upload image first (optional)
    if (itemForm.imageFile) {
      uploadedImageUrl = await uploadImage(itemForm.imageFile);
    }

    // 2) Create item (WITHOUT video first)
    const payload = {
      categoryId: itemForm.categoryId || null,
      name: itemForm.name,
      description: itemForm.description || "",
      price: Number(itemForm.price),
      images: uploadedImageUrl ? [uploadedImageUrl] : [],
      isAvailable: !!itemForm.isAvailable,
      isVeg: Boolean(itemForm.isVeg),
      ...(restaurantId ? { restaurantId } : {}),
    };

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "Failed to create item");

    const createdItemId = data?.item?._id;
    if (!createdItemId) throw new Error("Item created but itemId missing in response");

    // 3) Upload video AFTER item creation (optional)
    if (itemForm.videoFile) {
      await uploadVideo(createdItemId, itemForm.videoFile);
    }

    alert("Item created successfully!");

    setItemForm({
      categoryId: "",
      name: "",
      description: "",
      price: "",
      imageFile: null,
      videoFile: null,
      imageUrl: "",
      isAvailable: true,
      isVeg: true,
    });

    setShowItemModal(false);

    // 4) Refresh list so new videos show in returned items
    fetchItems();
  } catch (e) {
    alert(e.message || "Failed to create item");
  }
};


  const deleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete category");

      fetchCategories();
    } catch (e) {
      alert(e.message || "Failed to delete category");
    }
  };

  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete item");

      fetchItems();
    } catch (e) {
      alert(e.message || "Failed to delete item");
    }
  };

  // Loading and error states remain the same...
  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent mb-4"></div>
        <p className="text-gray-300 text-lg">Loading your menu...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md backdrop-blur-sm">
        <p className="text-red-400 text-lg">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Menu Management
          </h1>
          <p className="text-gray-400">Manage your restaurant categories and menu items</p>
        </div>

        {/* Premium Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-2 mb-8 border border-slate-700/50 inline-flex gap-2">
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === "categories"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50"
                : "text-gray-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            Categories
          </button>
          <button
            onClick={() => setActiveTab("items")}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              activeTab === "items"
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/50"
                : "text-gray-400 hover:text-white hover:bg-slate-700/50"
            }`}
          >
            Menu Items
          </button>
        </div>

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <div>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="mb-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Add Category
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat) => (
                <div
                  key={cat._id}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-xl text-white mb-2 group-hover:text-blue-400 transition-colors">
                        {cat.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Order:</span>
                        <span className="text-sm font-medium text-gray-300 bg-slate-700/50 px-3 py-1 rounded-lg">
                          {cat.order ?? 0}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        cat.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteCategory(cat._id)}
                    className="w-full mt-4 px-4 py-2.5 bg-red-500/10 text-red-400 rounded-xl font-medium hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                  >
                    <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    Delete
                  </button>
                </div>
              ))}
            </div>

            {/* Category Modal */}
            {showCategoryModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                <div className="bg-slate-800 border border-slate-700/50 rounded-3xl w-full max-w-md shadow-2xl">
                  <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <h2 className="text-2xl font-bold text-white">Add Category</h2>
                    <button
                      onClick={() => setShowCategoryModal(false)}
                      className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Appetizers"
                        value={categoryForm.name}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, name: e.target.value })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Display Order</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={categoryForm.order}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            order: Number(e.target.value),
                          })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>

                    <label className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={categoryForm.isActive}
                        onChange={(e) =>
                          setCategoryForm({
                            ...categoryForm,
                            isActive: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="text-gray-300 font-medium">Active</span>
                    </label>
                  </div>

                  <div className="flex gap-3 p-6 border-t border-slate-700/50">
                    <button
                      onClick={() => setShowCategoryModal(false)}
                      className="flex-1 px-6 py-3 bg-slate-700/50 text-white rounded-xl font-medium hover:bg-slate-700 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createCategory}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Items Tab - UPDATED with Veg/Non-Veg column */}
        {activeTab === "items" && (
          <div>
            <button
              onClick={() => setShowItemModal(true)}
              className="mb-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300 flex items-center gap-2 group"
            >
              <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
              Add Menu Item
            </button>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700/30 border-b border-slate-700/50">
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Item Name</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Type</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Price</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Status</th>
                      <th className="p-4 text-left text-sm font-semibold text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      // ✅ FIXED: Properly check isVeg with fallback
                      const isVeg = item.isVeg === true || item.veg === true;
                      
                      return (
                        <tr key={item._id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                          <td className="p-4 text-white font-medium">{item.name}</td>
                          
                          {/* ✅ FIXED: Veg/Non-Veg indicator with proper logic */}
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isVeg
                                  ? "border-emerald-400 bg-white"
                                  : "border-red-400 bg-white"
                              }`}>
                                <div className={`w-2 h-2 rounded-full ${
                                  isVeg ? "bg-emerald-500" : "bg-red-500"
                                }`} />
                              </div>
                              <span className="text-sm text-gray-400">
                                {isVeg ? "Veg" : "Non-Veg"}
                              </span>
                            </div>
                          </td>
                          
                          <td className="p-4">
                            <span className="text-blue-400 font-semibold">₹{item.price}</span>
                          </td>
                          <td className="p-4">
                            {(() => {
                              const available =
                                item.isAvailable === true ||
                                item.available === true ||
                                item.isActive === true;

                              return (
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${
                                  available
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-red-500/20 text-red-400 border border-red-500/30"
                                }`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${available ? "bg-emerald-400" : "bg-red-400"}`} />
                                  {available ? "Available" : "Unavailable"}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => deleteItem(item._id)}
                              className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-300 flex items-center gap-2 group"
                            >
                              <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Item Modal - UPDATED with Veg/Non-Veg and fixed price */}
            {showItemModal && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
                <div className="bg-slate-800 border border-slate-700/50 rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                  <div className="flex items-center justify-between p-6 border-b border-slate-700/50 sticky top-0 bg-slate-800 z-10">
                    <h2 className="text-2xl font-bold text-white">Add Menu Item</h2>
                    <button
                      onClick={() => setShowItemModal(false)}
                      className="p-2 hover:bg-slate-700/50 rounded-xl transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                      <select
                        value={itemForm.categoryId}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, categoryId: e.target.value })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      >
                        <option value="">Select Category</option>
                        {categories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Item Name</label>
                      <input
                        type="text"
                        placeholder="e.g., Margherita Pizza"
                        value={itemForm.name}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, name: e.target.value })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                      <input
                        type="text"
                        placeholder="Brief description"
                        value={itemForm.description}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>

                    {/* ✅ UPDATED: Fixed price field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        placeholder="Enter price"
                        value={itemForm.price}
                        onChange={(e) =>
                          setItemForm({
                            ...itemForm,
                            price: e.target.value,
                          })
                        }
                        className="w-full p-3 bg-slate-700/50 border border-slate-600/50 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                      />
                    </div>

                    {/* ✅ NEW: Veg/Non-Veg Toggle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-3">
                        Food Type <span className="text-red-400">*</span>
                      </label>
                      
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            console.log("🟢 VEG button clicked");
                            console.log("Before:", itemForm.isVeg);
                            setItemForm(prev => {
                              const updated = { ...prev, isVeg: true };
                              console.log("After:", updated.isVeg);
                              return updated;
                            });
                          }}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                            itemForm.isVeg === true
                              ? "border-emerald-500 bg-emerald-500/10"
                              : "border-slate-600/50 bg-slate-700/30 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-6 h-6 rounded border-2 border-emerald-400 bg-white flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            </div>
                            <span className={`font-medium ${itemForm.isVeg === true ? "text-emerald-400" : "text-gray-400"}`}>
                              Vegetarian
                            </span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            console.log("🔴 NON-VEG button clicked");
                            console.log("Before:", itemForm.isVeg);
                            setItemForm(prev => {
                              const updated = { ...prev, isVeg: false };
                              console.log("After:", updated.isVeg);
                              return updated;
                            });
                          }}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                            itemForm.isVeg === false
                              ? "border-red-500 bg-red-500/10"
                              : "border-slate-600/50 bg-slate-700/30 hover:border-slate-600"
                          }`}
                        >
                          <div className="flex items-center justify-center gap-3">
                            <div className="w-6 h-6 rounded border-2 border-red-400 bg-white flex items-center justify-center">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                            </div>
                            <span className={`font-medium ${itemForm.isVeg === false ? "text-red-400" : "text-gray-400"}`}>
                              Non-Veg
                            </span>
                          </div>
                        </button>
                      </div>
                      
                      {/* ✅ REAL-TIME DEBUG DISPLAY */}
                      <div className="mt-3 p-3 bg-slate-700/50 rounded-lg border border-slate-600/50">
                        <p className="text-xs text-gray-400">
                          <strong>Debug:</strong> isVeg = <code className="text-yellow-400">{JSON.stringify(itemForm.isVeg)}</code> 
                          (type: {typeof itemForm.isVeg})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Selected: {itemForm.isVeg === true ? "✅ Vegetarian" : "🍖 Non-Vegetarian"}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Image</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            setItemForm({
                              ...itemForm,
                              imageFile: e.target.files?.[0] || null,
                            })
                          }
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="flex items-center justify-center gap-2 w-full p-4 bg-slate-700/50 border-2 border-dashed border-slate-600/50 rounded-xl text-gray-400 hover:text-white hover:border-blue-500/50 cursor-pointer transition-all"
                        >
                          <Upload className="w-5 h-5" />
                          {itemForm.imageFile ? itemForm.imageFile.name : "Upload Image"}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Upload Video</label>
                      <div className="relative">
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) =>
                            setItemForm({
                              ...itemForm,
                              videoFile: e.target.files?.[0] || null,
                            })
                          }
                          className="hidden"
                          id="video-upload"
                        />
                        <label
                          htmlFor="video-upload"
                          className="flex items-center justify-center gap-2 w-full p-4 bg-slate-700/50 border-2 border-dashed border-slate-600/50 rounded-xl text-gray-400 hover:text-white hover:border-blue-500/50 cursor-pointer transition-all"
                        >
                          <Upload className="w-5 h-5" />
                          {itemForm.videoFile ? itemForm.videoFile.name : "Upload Video"}
                        </label>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 p-4 bg-slate-700/30 rounded-xl cursor-pointer hover:bg-slate-700/50 transition-colors">
                      <input
                        type="checkbox"
                        checked={itemForm.isAvailable}
                        onChange={(e) =>
                          setItemForm({ ...itemForm, isAvailable: e.target.checked })
                        }
                        className="w-5 h-5 rounded border-slate-600 text-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                      <span className="text-gray-300 font-medium">Available</span>
                    </label>
                  </div>

                  <div className="flex gap-3 p-6 border-t border-slate-700/50 sticky bottom-0 bg-slate-800">
                    <button
                      onClick={() => setShowItemModal(false)}
                      className="flex-1 px-6 py-3 bg-slate-700/50 text-white rounded-xl font-medium hover:bg-slate-700 transition-all duration-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createItem}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-300"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}