"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SuperAdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setError(null);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to login");

      // Enforce SUPER ADMIN
      if (data?.user?.role !== "SUPER_ADMIN") {
        throw new Error("This account is not a SUPER ADMIN");
      }

      // ✅ SAVE CORRECT TOKEN
      localStorage.setItem("superAdminToken", data.token);

      // ✅ REDIRECT TO CORRECT PAGE
      router.push("/super-admin/restaurants");
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, marginBottom: 16 }}>Super Admin Login</h1>

      {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}

      <input
        type="text"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        style={{ width: "100%", padding: 10, marginBottom: 10 }}
      />

      <button onClick={handleLogin} style={{ width: "100%", padding: 12 }}>
        Login
      </button>
    </div>
  );
}
