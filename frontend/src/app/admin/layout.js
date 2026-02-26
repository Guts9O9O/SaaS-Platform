"use client";
import "@/app/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken, clearAdminToken } from "@/lib/auth";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";

export default function AdminLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    // ✅ FIX: Check for token first before making any API call.
    // Previously it would call /api/admin/me with no token and get a 401,
    // but only AFTER the page had already partially rendered.
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }

    // ✅ FIX: Use auth helper instead of raw localStorage
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((res) => {
      if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — clear everything and redirect
        clearAdminToken();
        localStorage.removeItem("adminUser");
        localStorage.removeItem("restaurantId");
        router.replace("/admin/login");
      }
      if (res.status === 402) {
        router.replace("/admin/subscription");
      }
    }).catch(() => {
      // Network error — don't log out, just let the page load
      // (avoids logging out on flaky connections)
    });
  }, []);

  return (
    <div
      className="flex h-screen"
      style={{ background: "#0b0b0b", color: "#eaeaea" }}
    >
      <AdminSidebar />
      <div className="flex flex-col flex-1">
        <AdminTopbar />
        <main
          className="flex-1 overflow-y-auto"
          style={{ padding: 16, background: "#0b0b0b" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}