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

        console.log("[SA LOGIN] API:", process.env.NEXT_PUBLIC_API_URL);

        const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/auth/login`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        }
        );

        const text = await res.text();
        console.log("[SA LOGIN] status:", res.status);
        console.log("[SA LOGIN] raw response:", text);

        let data = {};
        try {
        data = JSON.parse(text);
        } catch {
        throw new Error("Backend returned non-JSON response. Check API URL / route.");
        }

        if (!res.ok) throw new Error(data.message || "Failed to login");

        console.log("[SA LOGIN] parsed user:", data?.user);

        // ✅ enforce super admin
        if (data?.user?.role !== "SUPER_ADMIN") {
        throw new Error("This account is not a SUPER ADMIN");
        }

        localStorage.setItem("adminToken", data.token);
        console.log("[SA LOGIN] token saved:", localStorage.getItem("adminToken"));

        router.push("/admin/super-admin");
    } catch (err) {
        console.log("[SA LOGIN] error:", err);
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
