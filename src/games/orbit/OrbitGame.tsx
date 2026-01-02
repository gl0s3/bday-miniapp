import React, { useEffect, useRef, useState } from "react";
import { beep } from "../../lib/sfx";
import { haptic } from "../../lib/tg";

type Props = { hasStar: boolean; onAward: () => void };

export default function OrbitGame({ hasStar, onAward }: Props) {
  const needHits = 30;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [message, setMessage] = useState("Тапай, когда точка в зелёной зоне");

  const stateRef = useRef({
    t: 0,
    speed: 1.10,
    targetAngle: Math.random() * Math.PI * 2,
    window: 1.05
  });

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

      const s = stateRef.current;
      s.t += dt * s.speed;

      ctx.clearRect(0, 0, c.width, c.height);
      const w = c.width,
        h = c.height;

      ctx.fillStyle = "rgba(11,16,32,1)";
      ctx.fillRect(0, 0, w, h);

      const cx = w / 2,
        cy = h / 2;
      const R = Math.min(w, h) * 0.33;

      ctx.strokeStyle = "rgba(255,255,255,0.16)";
      ctx.lineWidth = Math.max(2, Math.floor(Math.min(w, h) * 0.01));
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.stroke();

      const a0 = s.targetAngle - s.window / 2;
      const a1 = s.targetAngle + s.window / 2;
      ctx.strokeStyle = "rgba(34,197,94,0.90)";
      ctx.lineWidth *= 1.8;
      ctx.beginPath();
      ctx.arc(cx, cy, R, a0, a1);
      ctx.stroke();

      const a = s.t;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      ctx.fillStyle = "rgba(139,92,246,0.95)";
      ctx.beginPath();
      ctx.arc(x, y, Math.min(w, h) * 0.032, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = `${Math.floor(h * 0.045)}px system-ui`;
      ctx.fillText(`Счёт: ${score}`, 18, 44);
      ctx.fillStyle = "rgba(255,255,255,0.70)";
      ctx.fillText(`Попадания: ${hits}  Промахи: ${misses}`, 18, 86);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [hits, misses, score]);

  useEffect(() => {
    if (score >= needHits && !hasStar) {
      haptic("medium");
      beep(980, 90, 0.05);
      onAward();
    }
  }, [hasStar, needHits, onAward, score]);

  function tap() {
    const s = stateRef.current;
    const a = normalizeAngle(s.t);
    const ta = normalizeAngle(s.targetAngle);

    const diff = smallestAngleDiff(a, ta);
    const ok = diff <= s.window / 2;

    if (ok) {
      haptic("light");
      beep(760, 55, 0.04);
      setMessage("Попал!");

      setHits((v) => v + 1);
      setScore((sc) => sc + 1);

      s.speed = Math.min(1.55, s.speed + 0.015);
      s.window = Math.max(0.55, s.window - 0.02);
      s.targetAngle = Math.random() * Math.PI * 2;
    } else {
      haptic("light");
      beep(260, 70, 0.03);
      setMessage("Мимо: -5");

      setMisses((m) => m + 1);
      setScore((sc) => Math.max(0, sc - 5));

      s.window = Math.max(0.50, s.window - 0.01);
      s.targetAngle = Math.random() * Math.PI * 2;
    }
  }

  function reset() {
    setScore(0);
    setHits(0);
    setMisses(0);
    setMessage("Тапай, когда точка в зелёной зоне");
    stateRef.current.speed = 1.10;
    stateRef.current.window = 1.05;
    stateRef.current.targetAngle = Math.random() * Math.PI * 2;
  }

  return (
    <>
      <div className="card">
        <div className="h1">Orbit</div>
        <div className="p">Правила: по кругу летает фиолетовая точка. Есть зелёная зона. Тапай, когда точка в зоне.</div>
        <div className="p">Очки: попадание +1, промах -5. Зона постепенно уменьшается. Цель для звезды: набрать счёт {needHits}.</div>
        <div className="p">
          {message} | Звезда: {hasStar ? "★" : "☆"}
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div
        className="canvasWrap"
        onPointerDown={(e) => {
          e.preventDefault();
          tap();
        }}
        style={{ touchAction: "manipulation" }}
      >
        anvas ref={canvasRef} />
      </div>

      <div style={{ height: 10 }} />
      <button className="btn secondary" onClick={reset}>
        Сбросить
      </button>
    </>
  );
}

function normalizeAngle(a: number) {
  const two = Math.PI * 2;
  a = a % two;
  if (a < 0) a += two;
  return a;
}

function smallestAngleDiff(a: number, b: number) {
  const two = Math.PI * 2;
  let d = Math.abs(a - b) % two;
  if (d > Math.PI) d = two - d;
  return d;
}
