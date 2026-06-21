// Premium UI Audio Micro-interactions using Web Audio API
// Instant, offline, and zero-asset footprint.

let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// 1. Crisp, subtle click/pop sound for standard button presses
export const playClickSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // High pitch sliding down rapidly for a crisp "pop"
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.04);

    // Fast volume decay
    gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    console.warn("Audio playback blocked or unsupported:", e);
  }
};

// 2. Soft, low-frequency "swoosh" for tab swiping or card panning
export const playSwipeSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Smooth low-frequency sweep
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(280, ctx.currentTime + 0.15);

    // Fade in and out
    gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.04);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    console.warn("Audio playback blocked or unsupported:", e);
  }
};

// 3. Gentle double-chime for success or correct swipe
export const playSuccessSound = () => {
  try {
    const ctx = getAudioContext();
    
    // First chime (C5)
    const playChime = (freq, time, duration, vol) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(vol, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
      osc.start(time);
      osc.stop(time + duration);
    };

    const now = ctx.currentTime;
    playChime(523.25, now, 0.25, 0.05); // C5
    playChime(659.25, now + 0.08, 0.35, 0.04); // E5
  } catch (e) {
    console.warn("Audio playback blocked or unsupported:", e);
  }
};

// 4. Low-pitched alert sound for "Again" / error
export const playAgainSound = () => {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.18);

    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch (e) {
    console.warn("Audio playback blocked or unsupported:", e);
  }
};

// Dynamic interactive drag friction sound (oscillator hum linked to drag distance)
let dragOsc = null;
let dragGainNode = null;

export const startDragSound = () => {
  try {
    const ctx = getAudioContext();
    if (dragOsc) return; 

    dragOsc = ctx.createOscillator();
    dragGainNode = ctx.createGain();

    dragOsc.connect(dragGainNode);
    dragGainNode.connect(ctx.destination);

    dragOsc.type = 'triangle';
    dragOsc.frequency.setValueAtTime(65, ctx.currentTime);
    dragGainNode.gain.setValueAtTime(0.001, ctx.currentTime);

    dragOsc.start();
  } catch (e) {
    console.warn("Audio playback blocked or unsupported:", e);
  }
};

export const updateDragSound = (distance) => {
  try {
    if (!dragOsc || !dragGainNode) return;
    const ctx = getAudioContext();
    
    // Freq slides from 65Hz to 110Hz based on pull distance
    const targetFreq = 65 + Math.min(45, distance * 0.18);
    // Gain goes up to 0.035 proportional to distance
    const targetGain = Math.min(0.035, distance / 2200);

    dragOsc.frequency.setTargetAtTime(targetFreq, ctx.currentTime, 0.05);
    dragGainNode.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.05);
  } catch (e) {
    console.warn(e);
  }
};

export const stopDragSound = () => {
  try {
    if (!dragOsc || !dragGainNode) return;
    const ctx = getAudioContext();
    
    const currOsc = dragOsc;
    const currGain = dragGainNode;
    
    dragOsc = null;
    dragGainNode = null;

    currGain.gain.setTargetAtTime(0, ctx.currentTime, 0.03);
    setTimeout(() => {
      try {
        currOsc.stop();
        currOsc.disconnect();
        currGain.disconnect();
      } catch (e) {}
    }, 100);
  } catch (e) {
    console.warn(e);
  }
};
