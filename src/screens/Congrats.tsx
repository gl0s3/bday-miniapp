import React, { useEffect } from "react";
import TopBar from "../components/TopBar";
import Fireworks from "../components/Fireworks";
import { haptic } from "../lib/tg";
import { beep } from "../lib/sfx";

export default function Congrats(props: { onBack: () => void; unlocked: boolean }) {
  useEffect(() => {
    if (props.unlocked) {
      haptic("medium");
      beep(880, 90, 0.05);
      setTimeout(() => beep(1040, 90, 0.04), 120);
      setTimeout(() => beep(1320, 110, 0.035), 260);
    }
  }, [props.unlocked]);

  return (
    <>
      <TopBar title="Поздравление" onBack={props.onBack} />

      <div style={{ height: 10 }} />

      {!props.unlocked && (
        <div className="card">
          <div className="h1">Ещё рано</div>
          <div className="p">
            Тут будет главный салют и поздравление. Сначала собери 5 звёзд в мини‑играх — тогда откроется.
          </div>
        </div>
      )}

      {props.unlocked && (
        <>
          <div className="card">
            <div className="h1">Егор, поздравляю тебя с 30-летием!</div>
            <div className="p">

            </div>
            <div className="p">
              Желаю тебе счастья, здоровья, всего самого хорошего и наилучшего, успехов на работе и в жизни, всего что захочешь и пожелаешь и всего, всего, всего!!!

            </div>
            <div className="p">
             С юбилеем, твой брат Петя!!!
            </div>
            <div className="p">
              Тыкай по салюту, чтобы запускать новые залпы.
            </div>
          </div>

          <div style={{ height: 10 }} />
          <Fireworks active={true} />

          <div style={{ height: 10 }} />
          <button
            className="btn secondary"
            onClick={() => {
              haptic("light");
              beep(740, 60, 0.04);
              // небольшой “перезапуск” — просто перезагрузим страницу, чтобы салют обновился
              window.location.reload();
            }}
          >
            Ещё раз салют
          </button>
        </>
      )}
    </>
  );
}
