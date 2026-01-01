import React from "react";

export default function TopBar(props: { title: string; onBack?: () => void; right?: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button
        className="btn secondary"
        style={{ width: 90, padding: "10px 12px" }}
        onClick={props.onBack}
        disabled={!props.onBack}
      >
        Назад
      </button>
      <div style={{ flex: 1, fontWeight: 900 }}>{props.title}</div>
      <div>{props.right}</div>
    </div>
  );
}
