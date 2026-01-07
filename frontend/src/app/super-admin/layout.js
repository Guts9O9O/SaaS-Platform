"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function SuperAdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();

  /* ---------------- AUTH GUARD ---------------- */
  useEffect(() => {
    const token = localStorage.getItem("superAdminToken");
    if (!token && pathname !== "/super-admin/login") {
      router.push("/super-admin/login");
    }
  }, [pathname, router]);

  // Login page should not use layout UI
  if (pathname === "/super-admin/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-neutral-800 p-5">
        <div className="mb-8">
          <h2 className="text-xl font-semibold">Super Admin</h2>
          <p className="text-sm text-gray-400">
            SaaS Control Panel
          </p>
        </div>

        <nav className="space-y-2">
          <SidebarLink
            href="/super-admin/restaurants"
            label="Restaurants"
            pathname={pathname}
          />

          {/* Future */}
          <SidebarLink
            href="/super-admin"
            label="Dashboard"
            pathname={pathname}
            disabled
          />
          <SidebarLink
            href="/super-admin/plans"
            label="Plans"
            pathname={pathname}
            disabled
          />
        </nav>
      </aside>

      {/* MAIN */}
      <div className="flex flex-col flex-1">
        {/* TOPBAR */}
        <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6">
          <span className="text-sm text-gray-400">
            Logged in as Super Admin
          </span>

          <button
            onClick={() => {
              localStorage.removeItem("superAdminToken");
              router.push("/super-admin/login");
            }}
            className="px-3 py-1 rounded-lg border border-neutral-700 text-sm hover:bg-neutral-800 transition"
          >
            Logout
          </button>
        </header>

        {/* CONTENT */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

function SidebarLink({ href, label, pathname, disabled }) {
  const active = pathname === href;

  return (
    <button
      onClick={() => !disabled && (window.location.href = href)}
      disabled={disabled}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
        disabled
          ? "text-gray-600 cursor-not-allowed"
          : active
          ? "bg-neutral-800 text-white"
          : "text-gray-300 hover:bg-neutral-800"
      }`}
    >
      {label}
      {disabled && (
        <span className="ml-2 text-xs text-gray-500">(Soon)</span>
      )}
    </button>
  );
}