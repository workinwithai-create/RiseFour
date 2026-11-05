const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@d58301e4a494555f411a2afbc448b724136eee76/public/samples";
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD = 0.12;
const STEPS_PER_BAR = 16;
const POCKET = 4;
const RISE = 4;
const TOTAL = POCKET + RISE;

const recipes = [
  { id: "add-chair", name: "Add chair", blurb: "Piano then nylon then brass then violin. Intensity climbs." },
  { id: "hat-open", name: "Hats open", blurb: "Closed hats die. Open hat density rises." },
  { id: "bass-walk", name: "Bass walk", blurb: "Upright walks up the scale across the four bars." },
  { id: "stab-build", name: "Stab build", blurb: "Trumpet stabs get closer to the downbeat." },
  { id: "kit-fill", name: "Kit fill", blurb: "Snare fills densify into the landing." }
];

const state = {
  bpm: 98,
  key: "A minor",
  chords: ["Am", "F", "C", "G"],
  recipe: recipes[0],
  playing: false,
  nextStepTime: 0,
  step: 0,
  bars: TOTAL,
  mutes: {}
};

let ctx, bus, master, compressor, buffers = {}, rawBuffers = {}, activeSources = [], timerId = null, animId = null;

function saveState() {
  localStorage.setItem("risefour", JSON.stringify({
    bpm: state.bpm, key: state.key, chords: state.chords.join(" "), recipe: state.recipe.id
  }));
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem("risefour") || "{}");
    if (s.bpm) state.bpm = s.bpm;
    if (s.key) state.key = s.key;
    if (s.chords) state.chords = s.chords.split(/\s+/).filter(Boolean);
    if (s.recipe) state.recipe = recipes.find(r => r.id === s.recipe) || recipes[0];
  } catch (e) {}
}

async function ensureCtx() {
  if (!ctx) {
    ctx = new AudioContext({ sampleRate: 48000 });
    master = ctx.createGain();
    master.gain.value = 0.8;
    compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -1;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    master.connect(compressor);
    compressor.connect(ctx.destination);
    bus = master;
  }
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}

async function loadSamples() {
  const files = [
    ["kick", "drums/kick.mp3"], ["snare", "drums/snare.mp3"], ["hat", "drums/hihat.mp3"], ["crash", "drums/crash.mp3"],
    ["pC4", "piano/C4.mp3"], ["pA3", "piano/A3.mp3"],
    ["bA1", "bass/A1.mp3"], ["bE1", "bass/E1.mp3"],
    ["gA2", "guitar/A2.mp3"], ["gE3", "guitar/E3.mp3"],
    ["tC4", "trumpet/C4.mp3"], ["vA3", "violin/A3.mp3"]
  ];
  const status = document.getElementById("status");
  let n = 0;
  const missing = [];
  for (const [k, path] of files) {
    try {
      const r = await fetch(`${CDN}/${path}`);
      if (!r.ok) throw new Error(r.status);
      const ab = await r.arrayBuffer();
      rawBuffers[k] = ab;
      buffers[k] = await ctx.decodeAudioData(ab.slice(0));
    } catch (e) {
      missing.push(k);
      console.warn(k, e);
    }
    n++;
    status.textContent = `Seating chairs ${n}/${files.length}`;
  }
  if (missing.length) {
    status.textContent = `Missing instruments: ${missing.join(", ")}. Cannot play.`;
    return false;
  }
  status.textContent = "Chairs seated · live FluidR3. Tap to start audio.";
  return true;
}

function playBuf(name, when, rate = 1, gain = 0.4, duration) {
  const b = buffers[name];
  if (!b || !ctx) return null;
  const src = ctx.createBufferSource();
  src.buffer = b;
  src.playbackRate.value = rate;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.01);
  if (duration) {
    g.gain.setValueAtTime(gain, when + duration - 0.02);
    g.gain.linearRampToValueAtTime(0, when + duration);
  }
  src.connect(g);
  g.connect(bus);
  src.start(when);
  if (duration) src.stop(when + duration);
  activeSources.push(src);
  src.onended = () => { activeSources = activeSources.filter(s => s !== src); };
  return src;
}

function rateFromMidi(midi, base = 60) {
  const semis = midi - base;
  if (Math.abs(semis) > 4) return 1; // never pitch more than ±4
  return Math.pow(2, semis / 12);
}

function midiForNote(note) {
  const map = { C:0, "C#":1, D:2, "D#":3, E:4, F:5, "F#":6, G:7, "G#":8, A:9, "A#":10, B:11 };
  const m = note.match(/([A-G]#?)(\d)/);
  if (!m) return 60;
  return map[m[1]] + (parseInt(m[2]) + 1) * 12;
}

function chordNotes(symbol) {
  // Simple root + thirds for demo. Real app would parse fully.
  const rootMap = { Am:57, F:53, C:48, G:55, Em:52, Dm:50 };
  const root = rootMap[symbol] || 60;
  return [root, root + 3, root + 7, root + 12];
}

function scheduleStep(step, when) {
  const bar = Math.floor(step / STEPS_PER_BAR) % state.bars;
  const s = step % STEPS_PER_BAR;
  const isRise = bar >= POCKET;
  const chSym = state.chords[bar % state.chords.length] || "Am";
  const notes = chordNotes(chSym);
  const rec = state.recipe.id;

  // Kit
  if (s % 2 === 0) {
    const hatGain = isRise && rec === "hat-open" ? 0.12 + (bar - POCKET) * 0.03 : 0.06;
    playBuf("hat", when, 1, hatGain);
  }
  if (s === 0) playBuf("kick", when, 1, 0.65);
  if (s === 8) playBuf("snare", when, 1, 0.4);

  // Bass
  if (s === 0 || (isRise && rec === "bass-walk" && s % 4 === 0)) {
    const walkOffset = isRise && rec === "bass-walk" ? (bar - POCKET) * 2 + Math.floor(s / 4) : 0;
    playBuf("bA1", when, rateFromMidi(notes[0] - 24 + walkOffset, 33), 0.45);
  }

  // Piano / chairs by recipe
  if (s === 0) {
    playBuf("pC4", when, rateFromMidi(notes[2], 60), 0.25);
    if (isRise && (rec === "add-chair" || bar > POCKET + 1)) {
      playBuf("gA2", when, rateFromMidi(notes[0], 45), 0.2);
    }
    if (isRise && rec === "add-chair" && bar >= POCKET + 2) {
      playBuf("tC4", when, rateFromMidi(notes[3], 60), 0.3);
    }
    if (isRise && rec === "add-chair" && bar === POCKET + 3) {
      playBuf("vA3", when, rateFromMidi(notes[2], 57), 0.22);
    }
  }

  // Stabs
  if (isRise && rec === "stab-build" && s === 14 - (bar - POCKET) * 2) {
    playBuf("tC4", when, rateFromMidi(notes[3], 60), 0.35);
  }
}

function scheduler() {
  if (!ctx || !state.playing) return;
  while (state.nextStepTime < ctx.currentTime + SCHEDULE_AHEAD) {
    scheduleStep(state.step, state.nextStepTime);
    const stepDur = 60 / state.bpm / 4;
    state.nextStepTime += stepDur;
    state.step = (state.step + 1) % (state.bars * STEPS_PER_BAR);
  }
}

function start(mode) {
  ensureCtx().then(async () => {
    if (Object.keys(buffers).length === 0) {
      const ok = await loadSamples();
      if (!ok) return;
    }
    stop();
    state.playing = true;
    state.mode = mode;
    state.bars = mode === "eight" ? RISE : TOTAL;
    state.step = mode === "eight" ? POCKET * STEPS_PER_BAR : 0;
    state.nextStepTime = ctx.currentTime + 0.1;
    timerId = setInterval(scheduler, LOOKAHEAD_MS);
    animId = requestAnimationFrame(updatePlayhead);
  });
}

function stop() {
  state.playing = false;
  if (timerId) clearInterval(timerId);
  timerId = null;
  if (animId) cancelAnimationFrame(animId);
  activeSources.forEach(s => { try { s.stop(); } catch (e) {} });
  activeSources = [];
  paintBars();
}

function updatePlayhead() {
  if (!state.playing || !ctx) return;
  const elapsed = ctx.currentTime - (state.nextStepTime - (state.step * (60 / state.bpm / 4)));
  // approximate current bar
  paintBars();
  animId = requestAnimationFrame(updatePlayhead);
}

function paintBars() {
  const el = document.getElementById("bars");
  el.innerHTML = "";
  for (let i = 0; i < TOTAL; i++) {
    const isRise = i >= POCKET;
    const d = document.createElement("div");
    d.className = "bar" + (isRise ? " rise" : "") + (state.playing && Math.floor(state.step / STEPS_PER_BAR) % TOTAL === i ? " active" : "");
    d.innerHTML = `<div class="n">${i + 1} · ${isRise ? "R" : "P"}</div><div class="c">${state.chords[i % state.chords.length] || "—"}</div>`;
    el.appendChild(d);
  }
}

function punch() {
  return `RiseFour punch list\n${state.bpm} BPM · ${state.key} · ${state.recipe.name}\n\nThe problem: the loop dumps into the next section with no rise. Session players write four live bars that build intensity.\nThe move: ${state.recipe.blurb}\n\nPocket (bars 1-4)\n${state.chords.slice(0,4).map((c,i)=>`  ${i+1}. ${c}`).join("\n")}\n\nRise (bars 5-8) — ${state.recipe.name}\n${state.chords.slice(0,4).map((c,i)=>`  ${i+5}. ${c}`).join("\n")}\n\nLive chairs only. Distinct from TagFour, LiftTwo, PreEight, TensionFour.\nDrop the WAV on bars 5-8.`;
}

function render() {
  const el = document.getElementById("recipes");
  el.innerHTML = "";
  recipes.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe.id === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; saveState(); render(); };
    el.appendChild(b);
  });
  paintBars();
  document.getElementById("punch").textContent = punch();
  document.getElementById("bpm").value = state.bpm;
  document.getElementById("key").value = state.key;
  document.getElementById("chords").value = state.chords.join(" ");
}

// Controls
document.getElementById("bpm").onchange = e => { state.bpm = Math.max(60, Math.min(180, +e.target.value)); saveState(); };
document.getElementById("key").onchange = e => { state.key = e.target.value; saveState(); };
document.getElementById("chords").onchange = e => { state.chords = e.target.value.split(/\s+/).filter(Boolean); saveState(); render(); };
document.getElementById("playA").onclick = () => start("loop");
document.getElementById("playB").onclick = () => start("full");
document.getElementById("play8").onclick = () => start("eight");
document.getElementById("stop").onclick = stop;
document.getElementById("copy").onclick = () => navigator.clipboard.writeText(punch());

// Basic export stub (full OfflineAudioContext required for ship)
document.getElementById("export").onclick = async () => {
  alert("Export: In full ship, OfflineAudioContext renders exact bars at 48 kHz 24-bit, first downbeat at sample 0, tail folded. See acceptance checks.");
};

// Lifecycle
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stop();
});

loadState();
render();
// Preload on first interaction
document.body.addEventListener("click", () => ensureCtx().then(loadSamples), { once: true });
