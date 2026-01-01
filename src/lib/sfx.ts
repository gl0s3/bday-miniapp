let ctx: AudioContext | null = null;

function ensure() {
  if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  return ctx;
}

export function beep(freq = 660, ms = 70, gain = 0.05) {
  const c = ensure();
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g);
  g.connect(c.destination);
  o.start();
  setTimeout(() => o.stop(), ms);
}
