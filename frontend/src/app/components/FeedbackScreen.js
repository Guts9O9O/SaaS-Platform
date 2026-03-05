"use client";
import { useState, useEffect } from "react";

const STARS = [1, 2, 3, 4, 5];

const QUESTIONS = [
  { id: "food", label: "Food Quality" },
  { id: "service", label: "Service" },
  { id: "ambience", label: "Ambience" },
];

export default function FeedbackScreen({ restaurantName, tableCode, grandTotal, onDone }) {
  const [ratings, setRatings] = useState({ food: 0, service: 0, ambience: 0 });
  const [hoveredStar, setHoveredStar] = useState({ food: 0, service: 0, ambience: 0 });
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(12);
  const [submitting, setSubmitting] = useState(false);

  // Auto-skip countdown after submission
  useEffect(() => {
    if (!submitted) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(interval); onDone(); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [submitted, onDone]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Fire and forget — don't block UX on this
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/customer/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ratings, comment, tableCode }),
      }).catch(() => {});
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  const allRated = QUESTIONS.every((q) => ratings[q.id] > 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes starPop { 0%,100% { transform:scale(1); } 50% { transform:scale(1.35); } }
        @keyframes checkIn { from { transform:scale(0) rotate(-20deg); opacity:0; } to { transform:scale(1) rotate(0); opacity:1; } }
        .star-btn { transition: transform 0.15s; }
        .star-btn:hover { transform: scale(1.2); }
      `}</style>

      <div style={{ position:"fixed", inset:0, background:"#0e0e0e", zIndex:9999, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"24px 20px", fontFamily:"'DM Sans',sans-serif", overflowY:"auto" }}>

        {!submitted ? (
          <div style={{ width:"100%", maxWidth:420, animation:"fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>

            {/* Header */}
            <div style={{ textAlign:"center", marginBottom:32 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🍽️</div>
              <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:"#f5f0e8", margin:"0 0 8px", letterSpacing:-0.5 }}>
                How was your experience?
              </h1>
              <p style={{ fontSize:13, color:"#8a8070", margin:0, fontWeight:300 }}>
                {restaurantName || "Thank you for dining with us"}
              </p>
              {grandTotal > 0 && (
                <div style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:10, padding:"6px 16px", background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.15)", borderRadius:100 }}>
                  <span style={{ fontSize:12, color:"#8a8070" }}>Bill Total</span>
                  <span style={{ fontSize:14, fontWeight:700, color:"#c9a84c" }}>₹{Number(grandTotal).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* Star ratings */}
            <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:24 }}>
              {QUESTIONS.map((q) => (
                <div key={q.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(245,240,232,0.06)", borderRadius:16, padding:"16px 20px" }}>
                  <p style={{ fontSize:13, color:"#8a8070", margin:"0 0 12px", letterSpacing:0.5 }}>{q.label}</p>
                  <div style={{ display:"flex", gap:8 }}>
                    {STARS.map((star) => {
                      const filled = star <= (hoveredStar[q.id] || ratings[q.id]);
                      return (
                        <button key={star} className="star-btn"
                          onClick={() => setRatings(r => ({ ...r, [q.id]: star }))}
                          onMouseEnter={() => setHoveredStar(h => ({ ...h, [q.id]: star }))}
                          onMouseLeave={() => setHoveredStar(h => ({ ...h, [q.id]: 0 }))}
                          style={{ background:"none", border:"none", cursor:"pointer", fontSize:32, padding:0, color: filled ? "#c9a84c" : "rgba(245,240,232,0.12)", transition:"color 0.15s" }}>
                          ★
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Comment */}
            <div style={{ marginBottom:24 }}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any comments? (optional)"
                rows={3}
                style={{ width:"100%", padding:"14px 16px", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(245,240,232,0.08)", borderRadius:14, color:"#f5f0e8", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", resize:"none", boxSizing:"border-box" }}
                onFocus={e => e.target.style.borderColor="rgba(201,168,76,0.3)"}
                onBlur={e => e.target.style.borderColor="rgba(245,240,232,0.08)"}
              />
            </div>

            {/* Buttons */}
            <button onClick={handleSubmit} disabled={!allRated || submitting}
              style={{ width:"100%", padding:"16px", background: allRated ? "#c9a84c" : "rgba(201,168,76,0.2)", color: allRated ? "#0e0e0e" : "#8a8070", border:"none", borderRadius:16, fontSize:15, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor: allRated ? "pointer" : "not-allowed", marginBottom:12, transition:"all 0.2s" }}>
              {submitting ? "Submitting..." : "Submit Feedback"}
            </button>

            <button onClick={onDone}
              style={{ width:"100%", padding:"14px", background:"transparent", border:"1px solid rgba(245,240,232,0.08)", borderRadius:16, fontSize:13, color:"#4a4540", fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}>
              Skip
            </button>
          </div>

        ) : (
          /* Thank you screen */
          <div style={{ textAlign:"center", animation:"fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) both", maxWidth:320 }}>
            <div style={{ width:80, height:80, borderRadius:"50%", background:"rgba(16,185,129,0.1)", border:"2px solid rgba(16,185,129,0.3)", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 24px", animation:"checkIn 0.5s cubic-bezier(0.16,1,0.3,1) both" }}>
              <span style={{ fontSize:36 }}>✓</span>
            </div>
            <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:700, color:"#f5f0e8", margin:"0 0 12px" }}>
              Thank You!
            </h2>
            <p style={{ fontSize:14, color:"#8a8070", fontWeight:300, lineHeight:1.7, margin:"0 0 24px" }}>
              Your feedback means a lot to us.<br />We hope to see you again soon! 🙏
            </p>
            <div style={{ fontSize:13, color:"#4a4540" }}>
              Closing in {countdown}s...
            </div>
            <button onClick={onDone} style={{ marginTop:16, padding:"12px 28px", background:"rgba(201,168,76,0.1)", border:"1px solid rgba(201,168,76,0.2)", borderRadius:100, fontSize:13, fontWeight:600, color:"#c9a84c", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              Done
            </button>
          </div>
        )}
      </div>
    </>
  );
}