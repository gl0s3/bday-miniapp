import React, { useMemo, useState } from "react";
import { beep } from "../../lib/sfx";
import { haptic } from "../../lib/tg";

type Props = { hasStar: boolean; onAward: () => void };
type Cell = { bomb: boolean; open: boolean };

function randInt(n: number) {
  return Math.floor(Math.random() * n);
}

export default function MinesGame({ hasStar, onAward }: Props) {
  const size = 4;
  const bombs = 3;

  const needOpen = 10; // из 13 безопасных — открыть 10 достаточно

  const [grid, setGrid] = useState<Cell[]>(() => newGrid(size, bombs));
  const [openSafe, setOpenSafe] = useState(0);

  const totalSafe = useMemo(() => size * size - bombs, [size, bombs]);

  function restart() {
    setGrid(newGrid(size, bombs));
    setOpenSafe(0);
  }

  function aroundBombs(i: number, g: Cell[]) {
    const x = i % size;
    const y = Math.floor(i / size);
    let c = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const ni = ny * size + nx;
        if (g[ni]?.bomb) c++;
      }
    }
    return c;
  }

  function open(i: number) {
    const cell = grid[i];
    if (!cell || cell.open) return;

    if (cell.bomb) {
      haptic("heavy");
      beep(160, 140, 0.06);
      restart();
      return;
    }

    haptic("light");
    beep(640, 45, 0.03);

    setGrid((g) => {
      const ng = [...g];
      ng[i] = { ...ng[i], open: true };
      return ng;
    });

    setOpenSafe((v) => {
      const nv = v + 1;
      if (nv >= needOpen && !hasStar) {
        haptic("medium");
        beep(900, 90, 0.05);
        onAward();
      }
      return nv;
    });
  }

  return (
    <>
      <div className="card">
        <div className="h1">Mines (простая)</div>
        <div className="p">
          Правила: нажимай клетки. Если попал на мину — раунд начинается заново. Если клетка безопасная — покажется число:
          сколько мин рядом (по диагонали тоже).
        </div>
        <div className="p">
          Цель: открыть {needOpen} безопасных клеток (не обязательно все). Открыто: {openSafe}/{Math.min(needOpen, totalSafe)}.
          Звезда: {hasStar ? "★" : "☆"}
        </div>
        <div className="p">Подсказка: “1” значит, что рядом ровно одна мина — смотри соседние клетки.</div>
      </div>

      <div style={{ height: 10 }} />

      <div className="card">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${size}, 1fr)`, gap: 10 }}>
          {grid.map((c, i) => {
            const n = aroundBombs(i, grid);
            const label = c.open ? (n === 0 ? "" : String(n)) : "";
            return (
              <button
                key={i}
                className="btn secondary"
                style={{
                  height: 64,
                  padding: 0,
                  borderRadius: 14,
                  fontWeight: 900,
                  background: c.open ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.07)"
                }}
                onClick={() => open(i)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={restart}>
        Сбросить раунд
      </button>
    </>
  );
}

function newGrid(size: number, bombs: number): Cell[] {
  const total = size * size;
  const g: Cell[] = Array.from({ length: total }, () => ({ bomb: false, open: false }));
  let placed = 0;
  while (placed < bombs) {
    const i = randInt(total);
    if (!g[i].bomb) {
      g[i].bomb = true;
      placed++;
    }
  }
  return g;
}
