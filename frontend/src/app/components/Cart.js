"use client";

import { useState } from "react";

export default function Cart({ cartItems, onIncrease, onDecrease, orderPlaced }) {
  const [animatingItemId, setAnimatingItemId] = useState(null);

  if (cartItems.length === 0) {
    return <p>Your cart is empty</p>;
  }

  const total = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

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
    <div style={{ marginTop: "30px" }}>
      <h2>Cart</h2>

      <ul>
        {cartItems.map((item) => (
          <li key={String(item.itemId)}
            style={{
              marginBottom: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Item name */}
            <span>
              {item.name} — ₹{item.price}
            </span>

            {/* Quantity controls */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <button
                disabled={orderPlaced}
                onClick={() => handleDecrease(item.itemId)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "50%",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  transform: "scale(1)",
                  transition: "transform 0.15s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                −
              </button>

              <span
                style={{
                  margin: "0 10px",
                  minWidth: "20px",
                  textAlign: "center",
                  fontWeight: "600",
                  transform:
                    animatingItemId === item.itemId
                      ? "scale(1.25)"
                      : "scale(1)",
                  transition: "transform 0.15s",
                }}
              >
                {item.quantity}
              </span>

              <button
                disabled={orderPlaced}
                onClick={() => handleIncrease(item.itemId)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "50%",
                  border: "1px solid #ccc",
                  cursor: "pointer",
                  transform: "scale(1)",
                  transition: "transform 0.15s",
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.9)")}
                onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
              >
                +
              </button>
            </div>
          </li>
        ))}
      </ul>

      <strong>Total: ₹{total}</strong>
    </div>
  );
}
    