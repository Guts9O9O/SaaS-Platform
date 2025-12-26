"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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

  const [categoryForm, setCategoryForm] = useState({ name: "", description: "", order: 0 });
  const [itemForm, setItemForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    price: 0,
    isAvailable: true,
  });

  /* Mount guard */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* Auth check */
  useEffect(() => {
    if (!mounted) return;
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }
    fetchCategories();
  }, [mounted, router]);

  /* Fetch categories */
  const fetchCategories = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data.categories || []);
      setLoading(false);
    } catch {
      setError("Failed to load categories");
      setLoading(false);
    }
  };

  /* Fetch items */
  const fetchItems = async () => {
    const token = localStorage.getItem("adminToken");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      setError("Failed to load items");
    }
  };

  useEffect(() => {
    if (activeTab === "items") {
      fetchItems();
    }
  }, [activeTab]);

  /* Create category */
  const createCategory = async () => {
    if (!categoryForm.name.trim()) return;
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(categoryForm),
        }
      );
      if (!res.ok) throw new Error();
      setCategoryForm({ name: "", description: "", order: 0 });
      setShowCategoryModal(false);
      fetchCategories();
    } catch {
      alert("Failed to create category");
    }
  };

  /* Create item */
  const createItem = async () => {
    if (!itemForm.name.trim() || !itemForm.price) return;
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(itemForm),
        }
      );
      if (!res.ok) throw new Error();
      setItemForm({
        categoryId: "",
        name: "",
        description: "",
        price: 0,
        isAvailable: true,
      });
      setShowItemModal(false);
      fetchItems();
    } catch {
      alert("Failed to create item");
    }
  };

  /* Delete category */
  const deleteCategory = async (id) => {
    if (!confirm("Delete this category?")) return;
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/categories/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error();
      fetchCategories();
    } catch {
      alert("Failed to delete category");
    }
  };

  /* Delete item */
  const deleteItem = async (id) => {
    if (!confirm("Delete this item?")) return;
    const token = localStorage.getItem("adminToken");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/menu/items/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error();
      fetchItems();
    } catch {
      alert("Failed to delete item");
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
                <h3 className="font-semibold text-lg">{cat.name}</h3>
                <p className="text-sm text-gray-400">{cat.description || "-"}</p>
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
                  type="text"
                  placeholder="Description"
                  value={categoryForm.description}
                  onChange={(e) =>
                    setCategoryForm({
                      ...categoryForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full p-2 mb-3 bg-gray-700 rounded text-white"
                />
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
                      {item.isAvailable ? "✓" : "✗"}
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
