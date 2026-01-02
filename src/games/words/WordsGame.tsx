import React, { useEffect, useMemo, useRef, useState } from "react";
import { beep } from "../../lib/sfx";
import { haptic } from "../../lib/tg";

type Props = { hasStar: boolean; onAward: () => void };

type Block = {
  x: number; // left in world px
  y: number; // top in world px
  w: number;
  h: number;
  color: string;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function hueColor(h: number, a = 0.95) {
  return `hsla(${h}, 90%, 62%, ${a})`;
}

export default function WordsGame({ hasStar, onAward }: Props) {
  const goal = 18;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  // score: what we count for star, includes perfect bonuses
  const [score, setScore] = useState(0);

  // height: number of placed blocks excluding base (display only)
  const [height, setHeight] = useState(0);

  const [best, setBest] = useState(() => Number(localStorage.getItem("stack_best") || 0));
  const [message, setMessage] = useState("Тапни, чтобы уронить блок");

  const canAward = useMemo(() => !hasStar && score >= goal, [hasStar, score, goal]);

  const stateRef = useRef({
    t: 0,
    dir: 1 as 1 | -1,
    speed: 180,
    camY: 0, // camera translate Y (negative = move world up)
    running: true,
    hue: 210,
    W: 360,
    H: 640,
    base: { x: 0, y: 0, w: 220, h: 26, color: hueColor(210) } as Block,
    moving: { x: 0, y: 0, w: 220, h: 26, color: hueColor(240) } as Block,
    stack: [] as Block[],
    // params
    perfectPx: 6, // how close to count as perfect
    // for small screen margins
    topMargin: 0
  });

  useEffect(() => {
    if (canAward) {
      haptic("medium");
      beep(980, 90, 0.05);
      onAward();
    }
  }, [canAward, onAward]);

  useEffect(() => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));

    const spawnMoving = () => {
      const s = stateRef.current;
      const top = s.stack[s.stack.length - 1];

      const y = top.y - top.h;
      s.hue = (s.hue + 24) % 360;

      s.moving = {
        x: Math.floor(-top.w * 0.7),
        y,
        w: top.w,
        h: top.h,
        color: hueColor(s.hue)
      };

      s.dir = 1;
      s.speed = clamp(175 + (s.stack.length - 1) * 8, 175, 330);
    };

    (stateRef.current as any).spawnMoving = spawnMoving;

    const initBase = () => {
      const s = stateRef.current;
      const baseW = Math.floor(s.W * 0.66);
      const blockH = Math.floor(s.H * 0.045);

      s.hue = 210;
      s.base = {
        x: Math.floor((s.W - baseW) / 2),
        y: Math.floor(s.H * 0.78),
        w: baseW,
        h: blockH,
        color: hueColor(s.hue)
      };

      s.stack = [s.base];
      s.camY = 0;
      s.t = 0;
      s.running = true;
      spawnMoving();
    };

    const resize = () => {
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);

      const s = stateRef.current;
      s.W = c.width;
      s.H = c.height;
      s.topMargin = Math.floor(s.H * 0.22); // keep tower top below this margin

      // if first time or stack empty: init
      if (s.stack.length === 0) initBase();
    };

    resize();
    window.addEventListener("resize", resize);

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      const s = stateRef.current;
      s.t += dt;

      if (s.running) {
        const top = s.stack[s.stack.length - 1];

        // move block
        s.moving.x += s.dir * s.speed * dt;
        const minX = -top.w * 0.85;
        const maxX = s.W - top.w * 0.15;

        if (s.moving.x < minX) {
          s.moving.x = minX;
          s.dir = 1;
        }
        if (s.moving.x > maxX) {
          s.moving.x = maxX;
          s.dir = -1;
        }

        // camera: ensure tower top stays visible
        // desired top of tower (world coords)
        const towerTopY = top.y; // top edge of current top block (y is top)
        // We want (towerTopY + camY) to be around topMargin
        const desiredCamY = s.topMargin - towerTopY;

        // Only move camera upward (more negative) when needed, and smooth it
        const targetCamY = Math.min(0, desiredCamY);
        // smooth damp
        s.camY += (targetCamY - s.camY) * clamp(dt * 6.5, 0, 1);
      }

      draw(ctx, s, score, height);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [height, score]);

  function drop() {
    const s = stateRef.current;
    if (!s.running) return;

    const top = s.stack[s.stack.length - 1];

    const a0 = s.moving.x;
    const a1 = s.moving.x + s.moving.w;
    const b0 = top.x;
    const b1 = top.x + top.w;

    const overlap0 = Math.max(a0, b0);
    const overlap1 = Math.min(a1, b1);
    const overlapW = overlap1 - overlap0;

    if (overlapW <= 10) {
      s.running = false;
      setMessage("Промах! Нажми «Заново» и попробуй ещё");
      haptic("heavy");
      beep(180, 140, 0.06);
      return;
    }

    // perfect check: almost same left edge AND width close enough
    const dx = Math.abs(s.moving.x - top.x);
    const dw = Math.abs(s.moving.w - top.w);
    const isPerfect = dx <= s.perfectPx && dw <= s.perfectPx;

    const placed: Block = isPerfect
      ? {
          // snap to perfect
          x: top.x,
          y: s.moving.y,
          w: top.w,
          h: s.moving.h,
          color: s.moving.color
        }
      : {
          x: overlap0,
          y: s.moving.y,
          w: overlapW,
          h: s.moving.h,
          color: s.moving.color
        };

    s.stack.push(placed);

    const newHeight = s.stack.length - 1;
    setHeight(newHeight);

    // scoring: +1 always, +2 extra if perfect
    setScore((sc) => {
      const add = isPerfect ? 3 : 1;
      const next = sc + add;

      setBest((b) => {
        const nb = Math.max(b, next);
        localStorage.setItem("stack_best", String(nb));
        return nb;
      });

      return next;
    });

    if (isPerfect) {
      setMessage("Идеально! +3");
      haptic("medium");
      beep(980, 60, 0.05);
      setTimeout(() => beep(1220, 60, 0.04), 90);
    } else {
      setMessage("Неплохо! +1");
      haptic("light");
      beep(740, 55, 0.04);
    }

    // next
    (s as any).spawnMoving?.();
  }

  function restart() {
    const s = stateRef.current;

    s.running = true;
    s.camY = 0;
    s.stack = [];

    setScore(0);
    setHeight(0);
    setMessage("Тапни, чтобы уронить блок");

    // re-init base and moving based on current canvas
    const baseW = Math.floor(s.W * 0.66);
    const blockH = Math.floor(s.H * 0.045);

    s.hue = 210;
    s.base = {
      x: Math.floor((s.W - baseW) / 2),
      y: Math.floor(s.H * 0.78),
      w: baseW,
      h: blockH,
      color: hueColor(s.hue)
    };

    s.stack = [s.base];
    (s as any).spawnMoving?.();
  }

  return (
    <>
      <div className="card">
        <div className="h1">Tower Stack</div>
        <div className="p">
          Правила: блок ездит влево‑вправо. Тапни — он “падает” и кладётся на башню. Остаётся только перекрытие.
          Если попасть очень точно — это <span className="kbd">идеально</span> и ты получаешь бонус.
        </div>
        <div className="p">
          Счёт: {score} (звезда за {goal}). Высота башни: {height}. Лучшее: {best}. Звезда: {hasStar ? "★" : "☆"}
        </div>
        <div className="p">{message}</div>
      </div>

      <div style={{ height: 10 }} />

      <div
        className="canvasWrap"
        onClick={drop}
        onTouchStart={(e) => {
          e.preventDefault();
          drop();
        }}
        style={{ touchAction: "manipulation" }}
      >
        <canvas ref={canvasRef} />
      </div>

      <div style={{ height: 10 }} />
      <button className="btn" onClick={restart}>
        Заново
      </button>
    </>
  );
}

function draw(ctx: CanvasRenderingContext2D, s: any, score: number, height: number) {
  const W = s.W as number;
  const H = s.H as number;

  // background
  ctx.fillStyle = "rgba(11,16,32,1)";
  ctx.fillRect(0, 0, W, H);

  // subtle glow
  const grad = ctx.createRadialGradient(W * 0.35, H * 0.15, 0, W * 0.35, H * 0.15, Math.max(W, H) * 0.9);
  grad.addColorStop(0, "rgba(139,92,246,0.28)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // grid
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let y = 0; y < H; y += Math.floor(H * 0.08)) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // world
  ctx.save();
  ctx.translate(0, s.camY);

  // stack
  for (const b of s.stack as Block[]) {
    ctx.fillStyle = b.color;
    roundRect(ctx, b.x, b.y, b.w, b.h, 14);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // moving
  if (s.running) {
    const m = s.moving as Block;
    ctx.fillStyle = m.color;
    roundRect(ctx, m.x, m.y, m.w, m.h, 14);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();

  // overlay if game over
  if (!s.running) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `${Math.floor(H * 0.06)}px system-ui`;
    ctx.fillText("Промах!", 18, H * 0.42);
    ctx.font = `${Math.floor(H * 0.04)}px system-ui`;
    ctx.fillText("Нажми «Заново»", 18, H * 0.48);
  }

  // HUD
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `${Math.floor(H * 0.04)}px system-ui`;
  ctx.fillText(`Счёт: ${score}`, 18, 42);
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  ctx.fillText(`Высота: ${height}`, 18, 84);
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
