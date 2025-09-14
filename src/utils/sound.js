// src/utils/sound.js
let audio;

function ensureFlute() {
  if (!audio) {
    audio = new Audio();
    audio.src = "/audio/flute.mp3";   // <— file at public/audio/flute.mp3
    audio.loop = true;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.volume = 0.25;               // users can still use device volume
  }
  return audio;
}

export async function startFlute() {
  const a = ensureFlute();
  try {
    await a.play();                    // must be called from a user gesture on iOS
  } catch (err) {
    console.warn("Flute autoplay blocked:", err);
  }
}

export function pauseFlute() {
  const a = ensureFlute();
  if (!a.paused) a.pause();
}

export function stopFlute() {
  const a = ensureFlute();
  a.pause();
  try { a.currentTime = 0; } catch {}
}
