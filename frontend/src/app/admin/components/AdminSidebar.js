"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Live Orders", href: "/admin/live-orders" },
  { label: "Tables", href: "/admin/tables" },
  { label: "Menu", href: "/admin/menu" },
  { label: "Revenue", href: "/admin/revenue" },
  { label: "Requests", href: "/admin/requests" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        background: "#121212",
        borderRight: "1px solid #262626",
        padding: 16,
      }}
    >
      {/* Brand */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#eaeaea" }}>
          Restaurant Admin
        </h2>
        <p style={{ fontSize: 12, color: "#a5a5a5" }}>
          Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ display: "grid", gap: 8 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: isActive ? "#1c1c1c" : "transparent",
                  border: isActive ? "1px solid #2a2a2a" : "1px solid transparent",
                  color: isActive ? "#ffffff" : "#a5a5a5",
                  fontWeight: isActive ? 600 : 500,
                  cursor: "pointer",
                }}
              >
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
