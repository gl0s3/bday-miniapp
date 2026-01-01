declare global {
  interface Window {
    Telegram?: any;
  }
}

export function tg() {
  return window.Telegram?.WebApp;
}

export function initTelegram() {
  const w = tg();
  if (!w) return;
  w.ready?.();
  try {
    w.expand?.();
    w.disableVerticalSwipes?.();
  } catch {
    // ignore
  }
}

export function haptic(type: "light" | "medium" | "heavy" = "light") {
  const w = tg();
  w?.HapticFeedback?.impactOccurred?.(type);
}
