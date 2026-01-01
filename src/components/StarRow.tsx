import React from "react";
import { StarsState, countStars } from "../lib/storage";

function Star({ on }: { on: boolean }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: on ? "rgba(34,197,94,0.20)" : "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 18
      }}
      aria-label={on ? "Звезда получена" : "Звезда не получена"}
    >
      {on ? "★" : "☆"}
    </div>
  );
}

export default function StarRow({ stars }: { stars: StarsState }) {
  const c = countStars(stars);
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Star on={stars.runner} />
        <Star on={stars.memory} />
        <Star on={stars.mines} />
        <Star on={stars.words} />
        <Star on={stars.orbit} />
      </div>
      <div className="badge">Прогресс: {c}/5</div>
    </div>
  );
}
