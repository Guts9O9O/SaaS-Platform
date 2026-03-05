"use client";
import { useEffect } from "react";

export default function CartDrawer({ isOpen, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
          transition: "opacity 0.3s",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "#161410",
        borderTop: "1px solid rgba(201,168,76,0.15)",
        borderRadius: "24px 24px 0 0",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        transition: "transform 0.35s cubic-bezier(0.16,1,0.3,1)",
        boxShadow: "0 -20px 60px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column",
        maxHeight: "80vh",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}>
        {/* Top accent line */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, rgba(201,168,76,0.4), transparent)", borderRadius: "24px 24px 0 0" }} />

        {/* Drag handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(245,240,232,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px 14px", borderBottom: "1px solid rgba(245,240,232,0.06)" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#f5f0e8", margin: 0, fontFamily: "inherit" }}>Your Cart</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "#8a8070", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {/* Scrollable content — flex:1 so it takes remaining space */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", WebkitOverflowScrolling: "touch" }}>
          {children}
        </div>
      </div>
    </>
  );
}