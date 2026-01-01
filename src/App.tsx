import React, { useEffect, useMemo, useState } from "react";
import Home from "./screens/Home";
import GameHub, { GameId } from "./screens/GameHub";
import Congrats from "./screens/Congrats";
import { initTelegram } from "./lib/tg";
import { loadStars, saveStars, StarsState, countStars } from "./lib/storage";

type Route =
  | { name: "home" }
  | { name: "hub" }
  | { name: "game"; id: GameId }
  | { name: "congrats" };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: "home" });
  const [stars, setStars] = useState<StarsState>(() => loadStars());

  useEffect(() => {
    initTelegram();
  }, []);

  useEffect(() => {
    saveStars(stars);
  }, [stars]);

  const unlocked = useMemo(() => countStars(stars) >= 5, [stars]);

  function award(id: GameId) {
    setStars((s) => ({ ...s, [id]: true }));
  }

  return (
    <div className="container">
      {route.name === "home" && (
        <Home
          stars={stars}
          onStart={() => setRoute({ name: "hub" })}
          onCongrats={() => setRoute({ name: "congrats" })}
          unlocked={unlocked}
        />
      )}

      {route.name === "hub" && (
        <GameHub
          stars={stars}
          onBack={() => setRoute({ name: "home" })}
          onOpen={(id) => setRoute({ name: "game", id })}
          unlocked={unlocked}
          onCongrats={() => setRoute({ name: "congrats" })}
        />
      )}

      {route.name === "game" && (
        <GameHub
          mode="play"
          gameId={route.id}
          stars={stars}
          onBack={() => setRoute({ name: "hub" })}
          onAward={(id) => award(id)}
        />
      )}

      {route.name === "congrats" && <Congrats onBack={() => setRoute({ name: "home" })} unlocked={unlocked} />}
    </div>
  );
}
