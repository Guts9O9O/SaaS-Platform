"use client";

export default function AdminTopbar() {
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
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#eaeaea",
          }}
        >
          Demo Restaurant
        </h1>
      </div>

      {/* Right: Admin + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontSize: 13,
            color: "#a5a5a5",
          }}
        >
          Admin
        </span>

        <button
          style={{
            background: "#1c1c1c",
            border: "1px solid #2a2a2a",
            color: "#eaeaea",
            padding: "6px 12px",
            borderRadius: 10,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
}
