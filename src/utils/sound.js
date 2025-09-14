// src/utils/sound.js
let audio;

function ensureFlute() {
  if (!audio) {
    audio = new Audio("/flute.mp3");   // put flute.mp3 into /public
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.25;               // gentle default; users control on device
  }
  return audio;
}

export async function startFlute() {
  const a = ensureFlute();
  try { await a.play(); } catch (err) { console.warn("Flute autoplay blocked:", err); }
}

export function stopFlute() {
  const a = ensureFlute();
  a.pause();
  a.currentTime = 0;
}
