import OBR from "@owlbear-rodeo/sdk";
import "@fontsource/alegreya/latin-700.css";
import "@fontsource/alegreya-sans/latin-400.css";
import "@fontsource/alegreya-sans/latin-500.css";
import "@fontsource/alegreya-sans/latin-700.css";
import "./style.css";
import { MILESTONES, parseNotes } from "./milestones.js";
import {
  applyCombat,
  applyMilestone,
  combatShare,
  createState,
  describeLevelUps,
  effectiveLevel,
  levelFromXp,
  renameCharacter,
  resetProgress,
  setCharacterXp,
  setCapLifted,
  undo,
  xpToNext,
  THRESHOLDS,
} from "./xp.js";

// One room-metadata key for the whole extension (room metadata is shared and limited to 16 kB).
const KEY = "es.phandelver.campana/xp";
const PART_NAMES = { 1: "Parte 1", 2: "Parte 2", 3: "Parte 3", 4: "Parte 4" };
// The GM's milestone notes live only in their own browser, never in the room.
const NOTES_KEY = "phandelver-xp/notas-hitos";

function loadNotes() {
  try {
    return localStorage.getItem(NOTES_KEY) ?? "";
  } catch {
    return "";
  }
}

let notes = parseNotes(loadNotes());

let state = createState();
let isGM = false;
// Outside Owlbear (plain browser) we run a local demo as GM so the page can be tried.
let save = async (next) => {
  state = next;
  render();
};

const $ = (id) => document.getElementById(id);
const fmt = (n) => n.toLocaleString("es-ES");

function showNotice(text, levelUp = false) {
  const el = $("notice");
  el.textContent = text;
  el.hidden = !text;
  // Restart the one-off glow so each new level-up is noticed.
  el.classList.remove("level-up");
  if (levelUp) {
    void el.offsetWidth;
    el.classList.add("level-up");
  }
}

function showError(text) {
  $("error").textContent = text;
  $("error").hidden = !text;
}

// Runs an action from xp.js, saves it and announces level-ups.
async function act(fn) {
  try {
    const result = fn(state);
    const next = result.state ?? result;
    showError("");
    if (result.levelUps?.length) {
      const text = `¡${describeLevelUps(result.levelUps, next.characters.length)}!`;
      showNotice(text, true);
      if (OBR.isAvailable) OBR.notification.show(text, "SUCCESS");
    }
    await save(next);
  } catch (err) {
    showError(err.message);
  }
}

function progressText(c) {
  const real = levelFromXp(c.xp);
  const shown = effectiveLevel(c.xp, state.capLifted);
  if (real > shown) return "Nivel 5 al desbloquearlo, al final de la aventura";
  const next = xpToNext(c.xp);
  return next === null ? "Nivel máximo de la aventura" : `Faltan ${fmt(next)} para nivel ${shown + 1}`;
}

// Four equal steps (1→2, 2→3, 3→4, 4→5), each filled by its share of XP.
function buildTrack(c) {
  const track = document.createElement("div");
  track.className = "track";
  track.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 4; i++) {
    const [from, to] = [THRESHOLDS[i], THRESHOLDS[i + 1]];
    const fill = Math.min(1, Math.max(0, (c.xp - from) / (to - from)));
    const seg = document.createElement("span");
    seg.className = "seg";
    seg.style.setProperty("--fill", fill);
    track.append(seg);
  }
  const lock = document.createElement("span");
  lock.className = "lock";
  lock.classList.toggle("open", state.capLifted);
  lock.classList.toggle("waiting", !state.capLifted && c.xp >= THRESHOLDS[4]);
  track.append(lock);
  return track;
}

function renderParty() {
  const list = $("party");
  const focused = document.activeElement?.dataset.field;
  list.innerHTML = "";
  for (const c of state.characters) {
    const li = document.createElement("li");
    li.className = "pj";
    const head = document.createElement("div");
    head.className = "pj-head";
    const level = document.createElement("span");
    level.className = "lvl";
    level.innerHTML = `<small>nivel</small><b>${effectiveLevel(c.xp, state.capLifted)}</b>`;
    const foot = document.createElement("div");
    foot.className = "pj-foot";
    const left = document.createElement("span");
    left.className = "to-next";
    left.textContent = progressText(c);
    if (isGM) {
      const nameInput = Object.assign(document.createElement("input"), { value: c.name, maxLength: 30, className: "name" });
      nameInput.setAttribute("aria-label", "Nombre del personaje");
      nameInput.dataset.field = `${c.id}-name`;
      nameInput.addEventListener("change", () => act((s) => renameCharacter(s, c.id, nameInput.value)));
      const xpInput = Object.assign(document.createElement("input"), { type: "number", min: 0, step: 1, value: c.xp, className: "xp" });
      xpInput.setAttribute("aria-label", `XP de ${c.name} (ajuste a mano)`);
      xpInput.dataset.field = `${c.id}-xp`;
      xpInput.addEventListener("change", () => act((s) => setCharacterXp(s, c.id, Number(xpInput.value))));
      head.append(nameInput, level);
      const xpLabel = document.createElement("label");
      xpLabel.className = "xp-edit";
      xpLabel.append(xpInput, " XP");
      foot.append(xpLabel, left);
    } else {
      head.append(Object.assign(document.createElement("span"), { className: "name", textContent: c.name }), level);
      foot.append(Object.assign(document.createElement("span"), { className: "xp", textContent: `${fmt(c.xp)} XP` }), left);
    }
    li.append(head, buildTrack(c), foot);
    list.append(li);
  }
  if (focused) list.querySelector(`[data-field="${focused}"]`)?.focus();
}

function renderPresent() {
  const box = $("present");
  const checked = new Set([...box.querySelectorAll("input:checked")].map((i) => i.value));
  const fresh = !box.querySelector("label");
  box.querySelectorAll("label").forEach((l) => l.remove());
  for (const c of state.characters) {
    const label = document.createElement("label");
    label.className = "chip";
    const input = Object.assign(document.createElement("input"), { type: "checkbox", value: c.id });
    input.checked = fresh || checked.has(c.id);
    input.addEventListener("change", updatePreview);
    label.append(input, Object.assign(document.createElement("span"), { textContent: c.name }));
    box.append(label);
  }
  updatePreview();
}

function presentIds() {
  return [...$("present").querySelectorAll("input:checked")].map((i) => i.value);
}

function updatePreview() {
  const total = Number($("combat-xp").value);
  const n = presentIds().length;
  $("combat-preview").textContent =
    total > 0 && n > 0
      ? `${fmt(total)} ÷ ${n} = +${fmt(combatShare(total, n))} XP para cada presente`
      : "Se reparte entre los presentes, redondeando hacia arriba.";
}

function renderMilestones() {
  const list = $("milestones");
  list.innerHTML = "";
  let part = 0;
  for (const m of MILESTONES) {
    if (m.part !== part) {
      part = m.part;
      const h = document.createElement("li");
      h.className = "part";
      h.textContent = PART_NAMES[part];
      list.append(h);
    }
    const done = state.milestones.includes(m.id);
    const li = document.createElement("li");
    li.className = done ? "step done" : "step";
    const extra = m.minXp ? `, y mínimo ${fmt(m.minXp)}` : "";
    li.innerHTML = `<span class="node" aria-hidden="true"></span><span class="mid"></span><span class="mtext"></span><span class="mxp"></span>`;
    li.querySelector(".mid").textContent = m.id;
    li.querySelector(".mtext").textContent = (isGM && notes[m.id]) || `Hito ${m.id.slice(1)}`;
    li.querySelector(".mxp").textContent = `+${fmt(m.xp)} cada uno${extra}`;
    if (isGM && !done) {
      const btn = Object.assign(document.createElement("button"), { type: "button", textContent: "Apuntar", className: "quiet" });
      btn.setAttribute("aria-label", `Apuntar ${m.id}`);
      btn.addEventListener("click", () => act((s) => applyMilestone(s, m.id)));
      li.append(btn);
    }
    list.append(li);
  }
}

function renderLog() {
  const log = $("log");
  log.innerHTML = "";
  for (const line of [...state.log].reverse()) {
    log.append(Object.assign(document.createElement("li"), { textContent: line }));
  }
  if (!state.log.length) {
    const hint = isGM ? "Aún no hay nada. Suma un combate o apunta un hito." : "Aún no hay nada apuntado.";
    log.append(Object.assign(document.createElement("li"), { textContent: hint, className: "empty" }));
  }
  $("undo").disabled = !state.undo;
}

function render() {
  document.body.classList.toggle("gm", isGM);
  $("role").textContent = isGM ? "Máster" : "Jugador (solo ver)";
  $("cap").checked = state.capLifted;
  $("cap").disabled = !isGM;
  $("gate").classList.toggle("open", state.capLifted);
  $("gate-title").textContent = state.capLifted ? "Nivel 5 desbloqueado" : "Nivel 5 bloqueado";
  $("gate-hint").textContent = state.capLifted
    ? "Ya se puede subir a nivel 5."
    : "Nadie pasa de nivel 4 hasta el final de la aventura.";
  renderParty();
  if (isGM) renderPresent();
  renderMilestones();
  renderLog();
}

$("combat").addEventListener("submit", (e) => {
  e.preventDefault();
  const total = Number($("combat-xp").value);
  const label = $("combat-label").value.trim() || "Combate";
  act((s) => applyCombat(s, total, presentIds(), label)).then(() => {
    if ($("error").hidden) {
      $("combat-xp").value = "";
      $("combat-label").value = "";
      updatePreview();
    }
  });
});
$("combat-xp").addEventListener("input", updatePreview);
$("cap").addEventListener("change", (e) => act((s) => setCapLifted(s, e.target.checked)));
$("notes").value = loadNotes();
$("notes-save").addEventListener("click", () => {
  const text = $("notes").value;
  try {
    localStorage.setItem(NOTES_KEY, text);
  } catch {
    showError("Este navegador no deja guardar las notas.");
    return;
  }
  notes = parseNotes(text);
  showNotice(`Notas guardadas: ${Object.keys(notes).length} hitos.`);
  render();
});
// Two clicks, since browser confirm dialogs may be blocked inside Owlbear.
let resetTimer = null;
$("reset").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  if (!resetTimer) {
    btn.textContent = "¿Seguro? Pulsa otra vez para borrar la XP y los hitos";
    resetTimer = setTimeout(() => {
      resetTimer = null;
      btn.textContent = "Empezar de cero";
    }, 5000);
    return;
  }
  clearTimeout(resetTimer);
  resetTimer = null;
  btn.textContent = "Empezar de cero";
  showNotice("");
  act((s) => resetProgress(s));
});
$("undo").addEventListener("click", () => {
  showNotice("");
  act((s) => undo(s));
});

// The extension keeps its own palette; it only follows Owlbear's light/dark mode.
function applyTheme(theme) {
  document.documentElement.dataset.mode = theme.mode.toLowerCase();
}

function readState(metadata) {
  const saved = metadata[KEY];
  return saved && Array.isArray(saved.characters) ? saved : createState();
}

if (OBR.isAvailable) {
  OBR.onReady(async () => {
    isGM = (await OBR.player.getRole()) === "GM";
    save = (next) => OBR.room.setMetadata({ [KEY]: next });
    applyTheme(await OBR.theme.getTheme());
    OBR.theme.onChange(applyTheme);
    state = readState(await OBR.room.getMetadata());
    render();
    OBR.room.onMetadataChange((metadata) => {
      state = readState(metadata);
      render();
    });
    OBR.player.onChange((player) => {
      isGM = player.role === "GM";
      render();
    });
  });
} else {
  isGM = new URLSearchParams(location.search).get("rol") !== "jugador";
  render();
  showNotice("Modo de prueba fuera de Owlbear: los datos no se guardan.");
}
