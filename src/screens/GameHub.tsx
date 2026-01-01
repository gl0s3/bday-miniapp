import React from "react";
import TopBar from "../components/TopBar";
import StarRow from "../components/StarRow";
import { StarsState, countStars } from "../lib/storage";
import RunnerGame from "../games/runner/RunnerGame";
import MemoryGame from "../games/memory/MemoryGame";
import MinesGame from "../games/mines/MinesGame";
import WordsGame from "../games/words/WordsGame";
import OrbitGame from "../games/orbit/OrbitGame";

export type GameId = "runner" | "memory" | "mines" | "words" | "orbit";

const games: Array<{
  id: GameId;
  title: string;
  goal: string;
  about: string;
}> = [
  {
    id: "runner",
    title: "1) Neon Runner",
    goal: "Звезда за 1600 очков",
    about: "Свайпай влево/вправо, собирай монеты: 5 монет = щит"
  },
  {
    id: "memory",
    title: "2) Memory",
    goal: "Звезда за 6 уровней",
    about: "Открывай 2 карточки: совпали — остаются, не совпали — закроются"
  },
  {
    id: "mines",
    title: "3) Mines (простая)",
    goal: "Звезда за 10 безопасных клеток",
    about: "Открывай клетки, избегай мин. Число показывает сколько мин рядом"
  },
  {
    id: "words",
    title: "4) Tower Stack",
    goal: "Звезда за счёт 18",
    about: "Тапай, чтобы уронить блок. Идеально попал — бонус. Экран поднимается"
  },
  {
    id: "orbit",
    title: "5) Orbit",
    goal: "Звезда за счёт 30",
    about: "Попадание +1, промах -5, зона уменьшается"
  }
];

export default function GameHub(
  props:
    | {
        mode?: "list";
        stars: StarsState;
        onBack: () => void;
        onOpen: (id: GameId) => void;
        unlocked: boolean;
        onCongrats: () => void;
      }
    | {
        mode: "play";
        gameId: GameId;
        stars: StarsState;
        onBack: () => void;
        onAward: (id: GameId) => void;
      }
) {
  if (props.mode === "play") {
    const right = <div className="badge">Звёзд: {countStars(props.stars)}/5</div>;

    return (
      <>
        <TopBar title="Игра" onBack={props.onBack} right={right} />
        <div style={{ height: 10 }} />

        {props.gameId === "runner" && (
          <RunnerGame hasStar={props.stars.runner} onAward={() => props.onAward("runner")} />
        )}
        {props.gameId === "memory" && (
          <MemoryGame hasStar={props.stars.memory} onAward={() => props.onAward("memory")} />
        )}
        {props.gameId === "mines" && (
          <MinesGame hasStar={props.stars.mines} onAward={() => props.onAward("mines")} />
        )}
        {props.gameId === "words" && (
          <WordsGame hasStar={props.stars.words} onAward={() => props.onAward("words")} />
        )}
        {props.gameId === "orbit" && (
          <OrbitGame hasStar={props.stars.orbit} onAward={() => props.onAward("orbit")} />
        )}
      </>
    );
  }

  return (
    <>
      <TopBar title="Выбор игр" onBack={props.onBack} right={<div className="badge">Тапай игру</div>} />
      <div style={{ height: 10 }} />
      <StarRow stars={props.stars} />
      <div style={{ height: 10 }} />

      <div className="grid">
        {games.map((g) => (
          <div key={g.id} className="tile" onClick={() => props.onOpen(g.id)} role="button">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div className="tileTitle">{g.title}</div>
              <div
                className="badge"
                style={{ color: props.stars[g.id] ? "rgba(255,255,255,0.95)" : "var(--muted)" }}
              >
                {props.stars[g.id] ? "★" : "☆"}
              </div>
            </div>
            <div className="tileMeta">{g.about}</div>
            <div className="tileMeta" style={{ marginTop: 6 }}>
              Цель: {g.goal}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={props.onCongrats} disabled={!props.unlocked}>
        Открыть поздравление
      </button>
    </>
  );
}
