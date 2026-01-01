import React, { useEffect, useMemo, useState } from "react";
import { beep } from "../../lib/sfx";
import { haptic } from "../../lib/tg";

type Props = { hasStar: boolean; onAward: () => void };

type Card = { id: string; face: string; revealed: boolean; matched: boolean };

const faces = ["🍕","🎮","⚽","🎧","🚀","🧩","🎸","🍔","🛡️","🧠","🎲","🏎️","🎯","🧨","🏆","🕹️"];

function pick<T>(arr: T[], n: number) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

export default function MemoryGame({ hasStar, onAward }: Props) {
  const targetLevel = 6;

  const config = useMemo(() => {
    // 4,5,6,7,8,10 pairs
    const pairsByLevel = [4, 5, 6, 7, 8, 10];
    return { pairs: pairsByLevel[0] };
  }, []);

  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(120);
  const [locked, setLocked] = useState(false);

  const [cards, setCards] = useState<Card[]>(() => makeLevel(1));
  const [opened, setOpened] = useState<string[]>([]);

  useEffect(() => {
    setCards(makeLevel(level));
    setOpened([]);
    setLocked(false);
    setTimeLeft(120);
  }, [level]);

  useEffect(() => {
    const t = setInterval(() => setTimeLeft((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (timeLeft === 0) {
      haptic("heavy");
      beep(200, 120, 0.06);
      setLevel(1);
    }
  }, [timeLeft]);

  useEffect(() => {
    const allMatched = cards.length > 0 && cards.every((c) => c.matched);
    if (allMatched) {
      haptic("medium");
      beep(820, 90, 0.05);
      if (level >= targetLevel) {
        if (!hasStar) onAward();
      } else {
        setTimeout(() => setLevel((l) => l + 1), 450);
      }
    }
  }, [cards, hasStar, level, onAward]);

  function tapCard(id: string) {
    if (locked) return;

    setCards((cs) =>
      cs.map((c) => (c.id === id && !c.matched ? { ...c, revealed: true } : c))
    );

    setOpened((o) => {
      if (o.includes(id)) return o;
      return [...o, id].slice(-2);
    });

    haptic("light");
  }

  useEffect(() => {
    if (opened.length !== 2) return;

    const [a, b] = opened;
    const ca = cards.find((c) => c.id === a);
    const cb = cards.find((c) => c.id === b);
    if (!ca || !cb) return;

    setLocked(true);

    const isPair = ca.face === cb.face && a !== b;

    setTimeout(() => {
      if (isPair) {
        beep(740, 60, 0.04);
        setCards((cs) =>
          cs.map((c) => (c.id === a || c.id === b ? { ...c, matched: true } : c))
        );
      } else {
        beep(260, 70, 0.03);
        setCards((cs) =>
          cs.map((c) => (c.id === a || c.id === b ? { ...c, revealed: false } : c))
        );
      }
      setOpened([]);
      setLocked(false);
    }, isPair ? 260 : 520);
  }, [opened, cards]);

  const pairsCount = useMemo(() => pairsForLevel(level), [level]);
  const matchedPairs = useMemo(() => {
    const m = cards.filter((c) => c.matched).length;
    return Math.floor(m / 2);
  }, [cards]);

  return (
    <>
      <div className="card">
        <div className="h1">Memory</div>
        <div className="p">
          Правила: перед тобой карточки “рубашкой вверх”. Нажми две карточки — если картинки совпали, пара остаётся открытой.
          Если не совпали — карточки закроются обратно.
        </div>
        <div className="p">
          Цель: пройти {targetLevel} уровней подряд. На каждом уровне нужно найти все пары. Времени много: 120 секунд.
        </div>
        <div className="p">
          Уровень {level}/{targetLevel} | Пары: {matchedPairs}/{pairsCount} | Время: {timeLeft}с | Звезда: {hasStar ? "★" : "☆"}
        </div>
      </div>

      <div style={{ height: 10 }} />

      <div className="card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10
          }}
        >
          {cards.map((c) => (
            <button
              key={c.id}
              className="btn secondary"
              style={{
                padding: 0,
                height: 72,
                borderRadius: 14,
                fontSize: 24,
                background: c.matched
                  ? "rgba(34,197,94,0.20)"
                  : c.revealed
                  ? "rgba(255,255,255,0.14)"
                  : "rgba(255,255,255,0.08)"
              }}
              onClick={() => {
                if (!c.revealed && !c.matched) tapCard(c.id);
              }}
            >
              {c.revealed || c.matched ? c.face : "?"}
            </button>
          ))}
        </div>

        <div className="p" style={{ marginTop: 10 }}>
          Совет: запоминай не “картинку”, а её место (например “пицца сверху слева”).
        </div>
      </div>

      <div style={{ height: 10 }} />
      <button className="btn" onClick={() => setLevel(1)}>
        Начать заново с 1 уровня
      </button>
    </>
  );
}

function pairsForLevel(level: number) {
  const pairsByLevel = [4, 5, 6, 7, 8, 10];
  return pairsByLevel[Math.max(1, Math.min(6, level)) - 1];
}

function makeLevel(level: number): Card[] {
  const pairs = pairsForLevel(level);
  const chosen = pick(faces, pairs);

  const all: Card[] = chosen.flatMap((f, i) => [
    { id: `l${level}_${i}_a`, face: f, revealed: false, matched: false },
    { id: `l${level}_${i}_b`, face: f, revealed: false, matched: false }
  ]);

  // make grid size 16 or 20 depending on pairs
  const target = pairs <= 8 ? 16 : 20;

  while (all.length < target) {
    all.push({ id: `f${level}_${all.length}`, face: "✖", revealed: false, matched: true });
  }

  // shuffle
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }

  // IMPORTANT: filler cards are marked matched=true, but we don't want them to show
  // so force them to be "invisible" by keeping them always revealed=false and matched=true
  // UI will render them as green blocks; acceptable as "пустые".
  return all;
}
