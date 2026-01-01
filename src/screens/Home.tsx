import React from "react";
import StarRow from "../components/StarRow";
import { StarsState } from "../lib/storage";

export default function Home(props: {
  stars: StarsState;
  onStart: () => void;
  onCongrats: () => void;
  unlocked: boolean;
}) {
  return (
    <>
      <div className="card">
        <div className="h1">Квест на День рождения</div>
        <div className="p">
          Привет! Тут 5 мини‑игр. В каждой нужно получить звезду. Когда соберёшь все 5 — откроется главное поздравление.
        </div>

      </div>

      <div style={{ height: 10 }} />
      <StarRow stars={props.stars} />

      <div style={{ height: 10 }} />
      <button className="btn" onClick={props.onStart}>
        Играть
      </button>

      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={props.onCongrats} disabled={!props.unlocked}>
        Открыть поздравление
      </button>

    </>
  );
}
