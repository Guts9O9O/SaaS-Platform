"use client";
import { useState } from "react";

export default function Cart({ cartItems, onIncrease, onDecrease, orderPlaced, onPlaceOrder, cartTotal, cartCount }) {
  const [animatingItemId, setAnimatingItemId] = useState(null);

  function moneyINR(n) { return `₹${Number(n || 0).toFixed(2)}`; }

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

  if (cartItems.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🛒</div>
        <p style={{ color: "#8a8070", fontSize: 15, fontWeight: 500 }}>Your cart is empty</p>
        <p style={{ color: "#4a4540", fontSize: 13, marginTop: 4 }}>Add items from the menu to get started</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Items list */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        {cartItems.map((item) => (
          <div key={String(item.itemId)} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", borderRadius: 16,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(245,240,232,0.07)",
          }}>
            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
              <p style={{ fontWeight: 600, color: "#f5f0e8", fontSize: 14, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.name}</p>
              <p style={{ fontSize: 13, color: "#c9a84c", margin: "3px 0 0", fontWeight: 500 }}>₹{item.price} × {item.quantity} = <span style={{ color: "#f5f0e8" }}>₹{(item.price * item.quantity).toFixed(2)}</span></p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.15)", borderRadius: 100, padding: "6px 12px" }}>
              <button disabled={orderPlaced} onClick={() => handleDecrease(item.itemId)}
                style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, opacity: orderPlaced ? 0.4 : 1 }}>−</button>
              <span style={{
                fontWeight: 700, color: "#f5f0e8", fontSize: 15, minWidth: 20, textAlign: "center",
                transform: animatingItemId === item.itemId ? "scale(1.3)" : "scale(1)",
                transition: "transform 0.15s",
                display: "inline-block",
              }}>{item.quantity}</span>
              <button disabled={orderPlaced} onClick={() => handleIncrease(item.itemId)}
                style={{ background: "none", border: "none", color: "#c9a84c", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, opacity: orderPlaced ? 0.4 : 1 }}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Sticky order footer */}
      <div style={{
        borderTop: "1px solid rgba(201,168,76,0.1)",
        paddingTop: 16, marginTop: "auto",
        background: "#161410",
        position: "sticky", bottom: 0,
      }}>
        

        {/* Place Order button */}
        <button
          onClick={onPlaceOrder}
          disabled={orderPlaced || cartItems.length === 0}
          style={{
            width: "100%", padding: "16px",
            background: orderPlaced ? "rgba(201,168,76,0.3)" : "#c9a84c",
            color: "#0e0e0e", border: "none", borderRadius: 16,
            fontSize: 16, fontWeight: 700,
            fontFamily: "inherit", cursor: orderPlaced ? "not-allowed" : "pointer",
            transition: "all 0.2s", letterSpacing: 0.3,
            opacity: orderPlaced ? 0.6 : 1,
          }}
        >
          {orderPlaced ? "✓ Order Placed!" : `Place Order `}
        </button>

        {/* Safe area for iPhone */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}