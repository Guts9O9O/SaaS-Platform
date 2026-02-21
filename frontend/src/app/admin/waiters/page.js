"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/auth";

export default function AdminWaitersPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [waiters, setWaiters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit modal state
  const [editingWaiter, setEditingWaiter] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => setMounted(true), []);

  const fetchWaiters = async () => {
    const token = getAdminToken();
    if (!token) return router.push("/admin/login");
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to load waiters");
      setWaiters(Array.isArray(data.waiters) ? data.waiters : []);
    } catch (e) {
      setError(e.message || "Failed to load waiters");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchWaiters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // CREATE
  const createWaiter = async () => {
    if (!name || !phone || !password) return;
    const token = getAdminToken();
    if (!token) return router.push("/admin/login");
    try {
      setCreating(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name, phone: phone.trim(), password }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to create waiter");
      setName("");
      setPhone("");
      setPassword("");
      fetchWaiters();
    } catch (e) {
      alert(e.message || "Failed to create waiter");
    } finally {
      setCreating(false);
    }
  };

  // OPEN EDIT MODAL
  const openEdit = (waiter) => {
    setEditingWaiter(waiter);
    setEditName(waiter.name || "");
    setEditPhone(waiter.phone || "");
    setEditPassword("");
  };

  // SAVE EDIT
  const saveEdit = async () => {
    if (!editName || !editPhone) return;
    const token = getAdminToken();
    if (!token) return router.push("/admin/login");
    try {
      setSaving(true);
      const body = { name: editName, phone: editPhone.trim() };
      if (editPassword.trim()) body.password = editPassword.trim();

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters/${editingWaiter._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to update waiter");
      setEditingWaiter(null);
      fetchWaiters();
    } catch (e) {
      alert(e.message || "Failed to update waiter");
    } finally {
      setSaving(false);
    }
  };

  // DELETE
  const deleteWaiter = async (waiterId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this waiter? This cannot be undone."
    );
    if (!confirmed) return;
    const token = getAdminToken();
    if (!token) return router.push("/admin/login");
    try {
      setDeletingId(waiterId);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/staff/waiters/${waiterId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Failed to delete waiter");
      fetchWaiters();
    } catch (e) {
      alert(e.message || "Failed to delete waiter");
    } finally {
      setDeletingId(null);
    }
  };

  if (!mounted) return null;
  if (loading) return <div className="text-gray-400">Loading waiters...</div>;
  if (error) return <div className="text-red-400">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Waiters / Staff</h1>
        <p className="text-gray-400 text-sm">
          Create and manage waiter login accounts
        </p>
      </div>

      {/* Create Waiter */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-white mb-4">
          Create New Waiter
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="tel"
            className="px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            type="password"
            className="px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button
          onClick={createWaiter}
          disabled={creating || !name || !phone || !password}
          className="mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
        >
          {creating ? "Creating..." : "Create Waiter"}
        </button>
      </div>

      {/* Waiter List */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-950/40">
            <tr>
              <th className="px-4 py-3 text-left text-gray-400">Name</th>
              <th className="px-4 py-3 text-left text-gray-400">Phone</th>
              <th className="px-4 py-3 text-left text-gray-400">Created</th>
              <th className="px-4 py-3 text-left text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {waiters.map((w) => (
              <tr
                key={w._id}
                className="border-t border-gray-800 hover:bg-gray-800/30"
              >
                <td className="px-4 py-3 text-white">{w.name}</td>
                <td className="px-4 py-3 text-gray-300">{w.phone}</td>
                <td className="px-4 py-3 text-gray-400">
                  {new Date(w.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(w)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 text-xs transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteWaiter(w._id)}
                      disabled={deletingId === w._id}
                      className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/30 text-xs transition disabled:opacity-50"
                    >
                      {deletingId === w._id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {waiters.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                  No waiters created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingWaiter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-5">
              Edit Waiter
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Name</label>
                <input
                  className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Phone Number"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">
                  New Password{" "}
                  <span className="text-gray-600">(leave blank to keep current)</span>
                </label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="New password (optional)"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditingWaiter(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={saving || !editName || !editPhone}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}