import React, { useEffect, useMemo, useRef, useState } from "react";
import { beep } from "../../lib/sfx";
import { haptic } from "../../lib/tg";

type Props = { hasStar: boolean; onAward: () => void };

type Block = {
  lane: number;
  y: number;
  h: number;
  wMul: number;
  speedMul: number;
  kind: "block" | "fast";
};

type Coin = { lane: number; y: number };

export default function RunnerGame({ hasStar, onAward }: Props) {
  const goal = 1600;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("runner_best") || 0));
  const [alive, setAlive] = useState(true);

  const [coins, setCoins] = useState(0);
  const [coinBank, setCoinBank] = useState(0); // копим до 5 => +1 щит
  const [shield, setShield] = useState(0);

  const state = useMemo(() => {
    return {
      lane: 1,
      t: 0,
      baseSpeed: 220,
      blocks: [] as Block[],
      coins: [] as Coin[],
      lastSpawn: 0,
      lastCoin: 0,
      lastLane: 1
    };
  }, []);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const W = c.width;
      const H = c.height;
      const laneW = W / 3;

      if (alive) {
        state.t += dt;
        const speed = state.baseSpeed + state.t * 34;

        // spawn obstacles
        state.lastSpawn += dt;
        const spawnEvery = Math.max(0.33, 0.82 - state.t * 0.018);
        if (state.lastSpawn >= spawnEvery) {
          state.lastSpawn = 0;

          let lane = Math.floor(Math.random() * 3);
          if (lane === state.lastLane && Math.random() < 0.6) {
            lane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
          }
          state.lastLane = lane;

          const isFast = Math.random() < Math.min(0.35, 0.10 + state.t * 0.015);
          const kind: Block["kind"] = isFast ? "fast" : "block";

          state.blocks.push({
            lane,
            y: -140,
            h: isFast ? 70 + Math.random() * 40 : 90 + Math.random() * 70,
            wMul: isFast ? 0.55 : 0.7,
            speedMul: isFast ? 1.35 : 1.0,
            kind
          });
        }

        // spawn coins
        state.lastCoin += dt;
        const coinEvery = Math.max(0.55, 1.25 - state.t * 0.02);
        if (state.lastCoin >= coinEvery) {
          state.lastCoin = 0;
          const lane = Math.floor(Math.random() * 3);
          state.coins.push({ lane, y: -90 });
        }

        // move
        for (const b of state.blocks) b.y += speed * b.speedMul * dt;
        for (const co of state.coins) co.y += speed * 0.95 * dt;

        state.blocks = state.blocks.filter((b) => b.y < 1400);
        state.coins = state.coins.filter((co) => co.y < 1400);

        // score
        const gained = Math.floor(speed * dt * 0.28);
        if (gained > 0) setScore((s) => s + gained);

        // player
        const playerY = 0.80;
        const px = state.lane * laneW + laneW / 2;
        const py = playerY * H;
        const pr = Math.min(laneW, H) * 0.05;

        // coin pickup
        for (const co of [...state.coins]) {
          const cx = co.lane * laneW + laneW / 2;
          const cy = co.y * (H / 900);
          const dist = Math.hypot(px - cx, py - cy);

          if (dist < pr * 1.9) {
            state.coins = state.coins.filter((x) => x !== co);

            setCoins((v) => v + 1);

            // bank -> shields
            setCoinBank((b) => {
              const nb = b + 1;
              if (nb >= 5) {
                setShield((s) => s + 1);
                haptic("medium");
                beep(720, 70, 0.05);
                return nb - 5;
              }
              haptic("light");
              beep(920, 35, 0.03);
              return nb;
            });
          }
        }

        // collision
        for (const b of [...state.blocks]) {
          const bx = b.lane * laneW + laneW / 2;
          const by = b.y * (H / 900);
          const bh = b.h * (H / 900);
          const bw = laneW * b.wMul;

          const hit =
            Math.abs(px - bx) < bw / 2 &&
            py + pr > by - bh / 2 &&
            py - pr < by + bh / 2;

          if (hit) {
            if (shield > 0) {
              // spend shield, remove this block, continue run
              state.blocks = state.blocks.filter((x) => x !== b);
              setShield((s) => Math.max(0, s - 1));
              haptic("medium");
              beep(520, 70, 0.05);
            } else {
              setAlive(false);
              haptic("heavy");
              beep(180, 120, 0.06);
            }
            break;
          }
        }
      }

      // draw
      ctx.clearRect(0, 0, W, H);
      drawBg(ctx, W, H, state.t);
      drawLanes(ctx, W, H);

      // coins
      for (const co of state.coins) {
        const x = co.lane * laneW + laneW / 2;
        const y = co.y * (H / 900);
        ctx.fillStyle = "rgba(245,158,11,0.95)";
        ctx.beginPath();
        ctx.arc(x, y, Math.min(laneW, H) * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }

      // blocks
      for (const b of state.blocks) {
        const x = b.lane * laneW + laneW / 2;
        const y = b.y * (H / 900);
        const h = b.h * (H / 900);
        ctx.fillStyle = b.kind === "fast" ? "rgba(255,80,160,0.92)" : "rgba(239,68,68,0.92)";
        roundRect(ctx, x - laneW * (b.wMul / 2), y - h / 2, laneW * b.wMul, h, 16);
        ctx.fill();
      }

      // player
      {
        const px = state.lane * laneW + laneW / 2;
        const py = H * 0.80;

        // glow
        ctx.fillStyle = "rgba(139,92,246,0.35)";
        ctx.beginPath();
        ctx.arc(px, py, Math.min(laneW, H) * 0.09, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "rgba(34,197,94,0.95)";
        ctx.beginPath();
        ctx.arc(px, py, Math.min(laneW, H) * 0.05, 0, Math.PI * 2);
        ctx.fill();

        if (shield > 0) {
          ctx.strokeStyle = "rgba(245,158,11,0.80)";
          ctx.lineWidth = Math.max(2, Math.floor(H * 0.006));
          ctx.beginPath();
          ctx.arc(px, py, Math.min(laneW, H) * 0.075, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // HUD
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = `${Math.floor(H * 0.038)}px system-ui`;
      ctx.fillText(`Очки: ${score}`, 18, 42);
      ctx.fillStyle = "rgba(255,255,255,0.80)";
      ctx.fillText(`Монеты: ${coins}  До щита: ${coinBank}/5  Щит: ${shield}`, 18, 82);
      ctx.fillStyle = hasStar ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.70)";
      ctx.fillText(`Цель: ${goal}`, 18, 122);

      if (!alive) {
        ctx.fillStyle = "rgba(0,0,0,0.58)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = `${Math.floor(H * 0.055)}px system-ui`;
        ctx.fillText("Конец забега!", 18, H * 0.40);
        ctx.font = `${Math.floor(H * 0.037)}px system-ui`;
        ctx.fillText("Собирай монеты: 5 монет = 1 щит", 18, H * 0.46);
        ctx.fillText("Щит тратится при столкновении", 18, H * 0.50);
        ctx.fillText("Тапни «Заново» и попробуй ещё", 18, H * 0.55);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [alive, coinBank, coins, goal, hasStar, score, shield, state]);

  useEffect(() => {
    if (!alive) {
      setBest((b) => {
        const nb = Math.max(b, score);
        localStorage.setItem("runner_best", String(nb));
        return nb;
      });
      if (score >= goal && !hasStar) {
        haptic("medium");
        beep(880, 90, 0.05);
        onAward();
      }
    }
  }, [alive, goal, hasStar, onAward, score]);

  function move(dir: -1 | 1) {
    if (!alive) return;
    state.lane = Math.max(0, Math.min(2, state.lane + dir));
    haptic("light");
  }

  function restart() {
    setScore(0);
    setCoins(0);
    setCoinBank(0);
    setShield(0);
    setAlive(true);

    state.lane = 1;
    state.t = 0;
    state.baseSpeed = 220;
    state.blocks = [];
    state.coins = [];
    state.lastSpawn = 0;
    state.lastCoin = 0;
    state.lastLane = 1;
  }

  return (
    <>
      <div className="card">
        <div className="h1">Neon Runner</div>
        <div className="p">
          Правила: ты в одной из 3 дорожек. Свайпай влево/вправо, чтобы менять дорожку и уклоняться от препятствий.
          Собирай монеты: каждые 5 монет дают 1 щит. Щит спасает от одного столкновения (и тратится).
        </div>
        <div className="p">
          Цель: набрать {goal} очков за один забег. Очки идут со временем и растут, когда скорость увеличивается.
        </div>
        <div className="p">Статус звезды: {hasStar ? "получена ★" : "ещё нет ☆"} | Лучшая попытка: {best}</div>
      </div>

      <div style={{ height: 10 }} />
      <div
        className="canvasWrap"
        onTouchStart={(e) => {
          const x = e.touches[0].clientX;
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const rel = (x - rect.left) / rect.width;
          move(rel < 0.5 ? -1 : 1);
        }}
      >
        <canvas ref={canvasRef} />
      </div>

      <div style={{ height: 10 }} />
      <div className="row">
        <button className="btn secondary" onClick={() => move(-1)} disabled={!alive}>
          Влево
        </button>
        <button className="btn secondary" onClick={() => move(1)} disabled={!alive}>
          Вправо
        </button>
      </div>

      <div style={{ height: 10 }} />
      <button className="btn" onClick={restart}>
        Заново
      </button>
    </>
  );
}

function drawBg(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
  ctx.fillStyle = "rgba(11,16,32,1)";
  ctx.fillRect(0, 0, w, h);
  const gx = (Math.sin(t * 0.7) * 0.4 + 0.5) * w;
  const gy = (Math.cos(t * 0.6) * 0.3 + 0.2) * h;
  const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.85);
  grad.addColorStop(0, "rgba(139,92,246,0.35)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

function drawLanes(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo((w / 3) * i, 0);
    ctx.lineTo((w / 3) * i, h);
    ctx.stroke();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
