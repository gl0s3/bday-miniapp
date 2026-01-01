export type StarsState = {
  runner: boolean;
  memory: boolean;
  mines: boolean;
  words: boolean;
  orbit: boolean;
};

const KEY = "bday_stars_v1";

export function loadStars(): StarsState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return { runner: false, memory: false, mines: false, words: false, orbit: false };
    }
    const parsed = JSON.parse(raw) as Partial<StarsState>;
    return {
      runner: !!parsed.runner,
      memory: !!parsed.memory,
      mines: !!parsed.mines,
      words: !!parsed.words,
      orbit: !!parsed.orbit
    };
  } catch {
    return { runner: false, memory: false, mines: false, words: false, orbit: false };
  }
}

export function saveStars(s: StarsState) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function countStars(s: StarsState) {
  return Object.values(s).filter(Boolean).length;
}

export function resetStars() {
  localStorage.removeItem(KEY);
}
