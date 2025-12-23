"use client";

import { useEffect } from "react";

export default function CartDrawer({ isOpen, onClose, children }) {
  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => (document.body.style.overflow = "");
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50
        bg-zinc-900 text-zinc-100
        rounded-t-2xl
        transform transition-transform duration-300 ease-out
        ${isOpen ? "translate-y-0" : "translate-y-full"}`}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-12 rounded-full bg-zinc-500" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 text-xl leading-none"
            aria-label="Close cart"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[75vh] overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </>
  );
}
