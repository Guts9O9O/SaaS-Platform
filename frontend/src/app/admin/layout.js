"use client";

import "@/app/globals.css";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./components/AdminSidebar";
import AdminTopbar from "./components/AdminTopbar";

export default function AdminLayout({ children }) {
  const router = useRouter();

  useEffect(() => {
    fetch("http://localhost:4000/api/admin/me", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("adminToken")}`,
      },
    }).then((res) => {
      if (res.status === 402) {
        router.push("/admin/subscription");
      }
      if (res.status === 403 || res.status === 401) {
        router.push("/admin/login");
      }
    });
  }, []);

  return (
    <div
      className="flex h-screen"
      style={{
        background: "#0b0b0b",
        color: "#eaeaea",
      }}
    >
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1">
        <AdminTopbar />

        <main
          className="flex-1 overflow-y-auto"
          style={{
            padding: 16,
            background: "#0b0b0b",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
