"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setWaiterToken, getWaiterToken } from "@/lib/auth";

export default function WaiterLoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState("");   // ✅ phone instead of email
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => setMounted(true), []);

  // ✅ If already logged in, silently redirect to dashboard
  useEffect(() => {
    if (!mounted) return;
    const token = getWaiterToken();
    if (token) router.replace("/waiter/dashboard");
  }, [mounted, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/waiter/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ✅ Send phone instead of email
          body: JSON.stringify({ phone: phone.trim(), password }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "Login failed");
      if (!data?.token) throw new Error("Token missing in response");
      setWaiterToken(data.token);
      router.replace("/waiter/dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900/60 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white">Waiter Login</h1>
          <p className="text-sm text-gray-400 mt-1">
            Sign in to receive table call notifications
          </p>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* ✅ Phone input instead of email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-gray-950/40 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !phone.trim() || !password}
            className="w-full px-4 py-3 rounded-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Signing in..." : "Login"}
          </button>

          <div className="text-xs text-gray-500 text-center">
            If you don't have access, ask your restaurant admin to create a
            waiter account.
          </div>
        </form>
      </div>
    </div>
  );
}