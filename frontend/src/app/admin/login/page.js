"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAdminToken, getAdminToken } from "@/lib/auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setMounted(true), []);

  // ✅ If already logged in, silently redirect
  useEffect(() => {
    if (!mounted) return;
    const token = getAdminToken();
    if (token) router.replace("/admin/live-orders");
  }, [mounted, router]);

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");
      if (!data?.token) throw new Error("Token missing in response");

      // ✅ FIX: Use auth helper instead of raw localStorage
      // and removed console.log that was leaking the token
      setAdminToken(data.token);

      // Save restaurantId and user info for socket rooms etc.
      if (data?.user?.restaurantId) {
        localStorage.setItem("restaurantId", data.user.restaurantId);
      } else {
        localStorage.removeItem("restaurantId");
      }
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      // ✅ FIX: Super admin goes to /super-admin, not the defunct /admin/super-admin
      if (data?.user?.role === "SUPER_ADMIN") {
        router.replace("/super-admin/restaurants");
        return;
      }

      router.replace("/admin/live-orders");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit on Enter key
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/60 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white">Restaurant Admin</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sign in to manage your restaurant
          </p>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              placeholder="admin@restaurant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="current-password"
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading || !email.trim() || !password}
            className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Waiter? Use the{" "}
            <a
              href="/waiter/login"
              className="text-blue-400 hover:text-blue-300 transition"
            >
              waiter login
            </a>{" "}
            instead.
          </p>
        </div>
      </div>
    </div>
  );
}