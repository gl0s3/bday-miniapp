import React, { useEffect, useRef } from "react";

type Props = {
  active: boolean;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  drag: number;
  gravity: number;
  sparkle: number;
};

type Burst = {
  t: number;
  x: number;
  y: number;
  hue: number;
  ring: boolean;
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export default function Fireworks({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const tRef = useRef(0);
  const lastAutoRef = useRef(0);

  useEffect(() => {
    if (!active) return;

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

    // initial bursts
    for (let i = 0; i < 4; i++) spawnBurst(c, dpr, burstsRef.current, true);

    let last = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      tRef.current += dt;
      lastAutoRef.current += dt;

      // auto bursts every ~0.9s with jitter
      const autoEvery = 0.78 + Math.sin(tRef.current * 0.9) * 0.18;
      if (lastAutoRef.current >= autoEvery) {
        lastAutoRef.current = 0;
        spawnBurst(c, dpr, burstsRef.current, Math.random() < 0.35);
      }

      // background fade (nice trails)
      ctx.fillStyle = "rgba(8, 10, 18, 0.18)";
      ctx.fillRect(0, 0, c.width, c.height);

      // soft vignette
      const vg = ctx.createRadialGradient(
        c.width * 0.5,
        c.height * 0.45,
        0,
        c.width * 0.5,
        c.height * 0.45,
        Math.max(c.width, c.height) * 0.7
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.25)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, c.width, c.height);

      stepBursts(dt, burstsRef.current, particlesRef.current);
      stepParticles(dt, particlesRef.current);

      drawParticles(ctx, particlesRef.current);

      rafRef.current = requestAnimationFrame(loop);
    };

    // clear to avoid old frame
    ctx.fillStyle = "rgba(8,10,18,1)";
    ctx.fillRect(0, 0, c.width, c.height);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active]);

  function tap(e: React.TouchEvent | React.MouseEvent) {
    if (!active) return;
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const nx = (clientX - rect.left) / rect.width;
    const ny = (clientY - rect.top) / rect.height;

    burstsRef.current.push({
      t: 0,
      x: nx,
      y: clamp(ny, 0.15, 0.75),
      hue: rnd(0, 360),
      ring: Math.random() < 0.45
    });
  }

  return (
    <div className="canvasWrap" onClick={tap} onTouchStart={(e) => { e.preventDefault(); tap(e); }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function spawnBurst(
  c: HTMLCanvasElement,
  dpr: number,
  bursts: Burst[],
  ring: boolean
) {
  // normalized coords
  const x = rnd(0.12, 0.88);
  const y = rnd(0.16, 0.55);
  bursts.push({
    t: 0,
    x,
    y,
    hue: rnd(0, 360),
    ring
  });
}

function stepBursts(dt: number, bursts: Burst[], particles: Particle[]) {
  // burst is a short-lived "flash" that spawns particles for ~0.08s
  for (const b of bursts) b.t += dt;

  const alive: Burst[] = [];
  for (const b of bursts) {
    if (b.t <= 0.09) {
      // spawn particles across a short time window -> richer explosion
      const k = Math.floor(rnd(18, 34));
      for (let i = 0; i < k; i++) {
        spawnParticleFromBurst(b, particles);
      }
      alive.push(b);
    }
  }
  bursts.length = 0;
  bursts.push(...alive);
}

function spawnParticleFromBurst(b: Burst, particles: Particle[]) {
  const angle = Math.random() * Math.PI * 2;

  const baseSpeed = b.ring ? rnd(220, 340) : rnd(120, 360);
  const speed = b.ring ? baseSpeed : baseSpeed * (0.35 + Math.random() * 0.75);

  const spread = b.ring ? 1.0 : 1.0;
  const vx = Math.cos(angle) * speed * spread;
  const vy = Math.sin(angle) * speed * spread;

  const life = b.ring ? rnd(0.9, 1.35) : rnd(0.75, 1.25);
  const size = b.ring ? rnd(1.6, 3.2) : rnd(1.3, 3.6);

  particles.push({
    x: b.x,
    y: b.y,
    vx,
    vy,
    life: life,
    maxLife: life,
    size,
    hue: (b.hue + rnd(-22, 22) + 360) % 360,
    drag: rnd(0.965, 0.985),
    gravity: rnd(420, 640),
    sparkle: rnd(0.0, 1.0)
  });
}

function stepParticles(dt: number, particles: Particle[]) {
  const next: Particle[] = [];
  for (const p of particles) {
    p.life -= dt;
    if (p.life <= 0) continue;

    // physics in normalized space mapped later; use "virtual pixels" scale
    p.vx *= Math.pow(p.drag, dt * 60);
    p.vy *= Math.pow(p.drag, dt * 60);
    p.vy += p.gravity * dt;

    // convert velocity into normalized delta: treat 1000px as 1.0
    p.x += (p.vx * dt) / 1000;
    p.y += (p.vy * dt) / 1000;

    // occasional sparkle split
    if (p.sparkle > 0.75 && Math.random() < 0.10) {
      const q: Particle = { ...p };
      q.vx *= rnd(0.7, 0.95);
      q.vy *= rnd(0.7, 0.95);
      q.size *= rnd(0.7, 0.95);
      q.life *= rnd(0.5, 0.8);
      next.push(q);
    }

    next.push(p);
  }
  particles.length = 0;
  particles.push(...next);
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const p of particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    const x = p.x * w;
    const y = p.y * h;

    const r = p.size * (1 + (1 - alpha) * 0.7);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r * 6);

    grad.addColorStop(0, `hsla(${p.hue}, 100%, 70%, ${0.85 * alpha})`);
    grad.addColorStop(0.2, `hsla(${p.hue}, 100%, 60%, ${0.35 * alpha})`);
    grad.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 5.5, 0, Math.PI * 2);
    ctx.fill();

    // bright core
    ctx.fillStyle = `hsla(${p.hue}, 100%, 78%, ${0.9 * alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
