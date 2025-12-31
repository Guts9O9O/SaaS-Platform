"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);

  // ✅ Backend-aligned category form (Fix #3)
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    order: 0,
    isActive: true,
  });

  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: 0,
    imageUrl: "",
    isAvailable: true,
  });

  /* Mount guard */
  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ restaurantId awareness (Fix #2)
  const { token, restaurantId } = useMemo(() => {
    const t = getToken();
    const payload = t ? safeDecodeJwtPayload(t) : null;
    return { token: t, restaurantId: payload?.restaurantId || null };
  }, [mounted]); // mounted ensures browser env

  /* Auth check */
  useEffect(() => {
    if (!mounted) return;
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, router, token]);

  const authHeaders = useMemo(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  /* Fetch categories */
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

  /* Fetch items */
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

      setItems(data.items || []);
    } catch (e) {
      setError(e.message || "Failed to load items");
    }
  };

  useEffect(() => {
    if (!mounted) return;
    if (activeTab === "items") {
      fetchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, mounted]);

  /* Create category */
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
          ...(restaurantId ? { restaurantId } : {}), // ✅ future-proof for SUPER_ADMIN
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

  /* Create item */
  const createItem = async () => {
    if (!itemForm.name.trim() || !Number(itemForm.price)) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          categoryId: itemForm.categoryId || null,
          name: itemForm.name,
          description: itemForm.description || "",
          price: Number(itemForm.price),
          images: itemForm.imageUrl ? [itemForm.imageUrl] : [],
          isAvailable: !!itemForm.isAvailable,   // ✅ force boolean
          ...(restaurantId ? { restaurantId } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create item");

      setItemForm({
        categoryId: "",
        name: "",
        description: "",
        price: 0,
        isAvailable: true,
      });
      setShowItemModal(false);
      fetchItems();
    } catch (e) {
      alert(e.message || "Failed to create item");
    }
  };

  /* Delete category */
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

  /* Delete item */
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

  if (!mounted) return null;
  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-semibold mb-6">Menu Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveTab("categories")}
          className={`px-4 py-2 ${
            activeTab === "categories"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-400"
          }`}
        >
          Categories
        </button>
        <button
          onClick={() => setActiveTab("items")}
          className={`px-4 py-2 ${
            activeTab === "items"
              ? "border-b-2 border-blue-500 text-blue-500"
              : "text-gray-400"
          }`}
        >
          Items
        </button>
      </div>

      {/* Categories Tab */}
      {activeTab === "categories" && (
        <div>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="mb-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            + Add Category
          </button>

          <div className="grid gap-4">
            {categories.map((cat) => (
              <div key={cat._id} className="p-4 bg-gray-800 rounded">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-lg">{cat.name}</h3>

                  {/* ✅ Status badge (Fix #4) */}
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      cat.isActive ? "bg-green-600" : "bg-red-600"
                    }`}
                  >
                    {cat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="text-sm text-gray-400 mt-1">
                  Order: <span className="text-gray-200">{cat.order ?? 0}</span>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => deleteCategory(cat._id)}
                    className="px-3 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Category Modal */}
          {showCategoryModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg w-96">
                <h2 className="text-xl font-semibold mb-4">Add Category</h2>

                <input
                  type="text"
                  placeholder="Category name"
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm({ ...categoryForm, name: e.target.value })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="number"
                  placeholder="Order (optional)"
                  value={categoryForm.order}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      order: Number(e.target.value),
                    })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                {/* ✅ isActive toggle (Fix #3/#4) */}
                <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                  <input
                    type="checkbox"
                    checked={categoryForm.isActive}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        isActive: e.target.checked,
                      })
                    }
                  />
                  Active
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={createCategory}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCategoryModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Items Tab */}
      {activeTab === "items" && (
        <div>
          <button
            onClick={() => setShowItemModal(true)}
            className="mb-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            + Add Item
          </button>

          <div className="overflow-x-auto">
            <table className="w-full border border-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Price</th>
                  <th className="p-3 text-left">Available</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id} className="border-t border-gray-700">
                    <td className="p-3">{item.name}</td>
                    <td className="p-3">₹{item.price}</td>
                    <td className="p-3">
                      {/* ✅ clearer availability badge (Fix #4) */}
                      {(() => {
                        const available =
                          item.isAvailable === true ||
                          item.available === true ||
                          item.isActive === true;

                        return (
                          <span className={`text-xs px-2 py-1 rounded ${available ? "bg-green-600" : "bg-red-600"}`}>
                            {available ? "Available" : "Unavailable"}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => deleteItem(item._id)}
                        className="px-2 py-1 bg-red-600 rounded text-sm hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Item Modal */}
          {showItemModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-gray-800 p-6 rounded-lg w-96 max-h-96 overflow-y-auto">
                <h2 className="text-xl font-semibold mb-4">Add Item</h2>

                <select
                  value={itemForm.categoryId}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, categoryId: e.target.value })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                >
                  <option value="">Select Category</option>
                  {categories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Item name"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="text"
                  placeholder="Description"
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="text"
                  placeholder="Image URL (optional)"
                  value={itemForm.imageUrl}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, imageUrl: e.target.value })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                <input
                  type="number"
                  placeholder="Price"
                  value={itemForm.price}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      price: parseFloat(e.target.value),
                    })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />

                <label className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                  <input
                    type="checkbox"
                    checked={itemForm.isAvailable}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, isAvailable: e.target.checked })
                    }
                  />
                  Available
                </label>

                <div className="flex gap-2">
                  <button
                    onClick={createItem}
                    className="flex-1 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowItemModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
