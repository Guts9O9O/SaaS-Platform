"use client";
import { useState } from "react";

export default function Cart({ cartItems, onIncrease, onDecrease, orderPlaced }) {
  const [animatingItemId, setAnimatingItemId] = useState(null);

  if (cartItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">Your cart is empty</p>
      </div>
    );
  }

  const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function handleIncrease(itemId) {
    setAnimatingItemId(itemId);
    onIncrease(itemId);
    setTimeout(() => setAnimatingItemId(null), 150);
  }

  function handleDecrease(itemId) {
    setAnimatingItemId(itemId);
    onDecrease(itemId);
    setTimeout(() => setAnimatingItemId(null), 150);
  }

  return (
    <div className="space-y-3">
      {cartItems.map((item) => (
        <div
          key={String(item.itemId)}
          className="flex items-center justify-between p-3 rounded-2xl bg-neutral-800/60 border border-neutral-700/40"
        >
          <div className="flex-1 min-w-0 mr-3">
            <p className="font-semibold text-white truncate">{item.name}</p>
            <p className="text-sm text-amber-400">₹{item.price}</p>
          </div>

          <div className="flex items-center gap-3 bg-black/40 rounded-xl px-2 py-1.5 border border-neutral-700/40">
            <button
              disabled={orderPlaced}
              onClick={() => handleDecrease(item.itemId)}
              className="text-amber-400 font-bold px-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" />
              </svg>
            </button>
            <span
              className="font-bold text-white min-w-[20px] text-center transition-transform"
              style={{
                transform: animatingItemId === item.itemId ? "scale(1.25)" : "scale(1)",
              }}
            >
              {item.quantity}
            </span>
            <button
              disabled={orderPlaced}
              onClick={() => handleIncrease(item.itemId)}
              className="text-amber-400 font-bold px-2 disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}