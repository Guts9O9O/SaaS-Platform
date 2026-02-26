"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { clearAdminToken } from "@/lib/auth";

export default function AdminTopbar() {
  const router = useRouter();
  const [adminUser, setAdminUser] = useState(null); // ✅ null on server AND client initially

  useEffect(() => {
    try {
      const stored = localStorage.getItem("adminUser");
      if (stored) setAdminUser(JSON.parse(stored));
    } catch {}
  }, []);

  const restaurantName = adminUser?.restaurantName || adminUser?.name || "Restaurant Admin";

  const handleLogout = () => {
    clearAdminToken();
    localStorage.removeItem("adminUser");
    localStorage.removeItem("restaurantId");
    router.replace("/admin/login");
  };

  return (
    <header
      style={{
        height: 56,
        borderBottom: "1px solid #262626",
        background: "#121212",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
      }}
    >
      {/* Left: Restaurant Name */}
      <div>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: "#eaeaea" }}>
          {restaurantName}
        </h1>
      </div>

      {/* Right: Admin label + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#a5a5a5" }}>
          {adminUser?.email || "Admin"}
        </span>
        {/* ✅ FIX: onClick wired up */}
        <button
          onClick={handleLogout}
          style={{
            background: "#1c1c1c",
            border: "1px solid #2a2a2a",
            color: "#eaeaea",
            padding: "6px 12px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 13,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#1c1c1c")}
        >
          Logout
        </button>
      </div>
    </header>
  );
}