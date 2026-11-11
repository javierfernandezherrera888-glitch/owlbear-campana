// Pure XP logic for the table. Every action returns a new state plus the
// level-ups it caused; nothing here talks to Owlbear Rodeo.
import { MILESTONES } from "./milestones.js";

// XP needed for levels 1..6 (index 0 = level 1).
export const THRESHOLDS = [0, 300, 900, 2700, 6500, 14000];
// Nobody reaches this level before the GM lifts the cap at the end of the adventure.
export const CAPPED_LEVEL = 5;
export const LOG_SIZE = 12;

export function levelFromXp(xp) {
  let level = 1;
  THRESHOLDS.forEach((min, i) => {
    if (xp >= min) level = i + 1;
  });
  return level;
}

// Level the character actually plays at, after the level-5 cap.
export function effectiveLevel(xp, capLifted) {
  const level = levelFromXp(xp);
  return capLifted ? level : Math.min(level, CAPPED_LEVEL - 1);
}

// XP still needed for the next level, or null at the top.
export function xpToNext(xp) {
  const next = THRESHOLDS.find((min) => min > xp);
  return next === undefined ? null : next - xp;
}

export function createState(names = ["Personaje 1", "Personaje 2", "Personaje 3", "Personaje 4"]) {
  return {
    characters: names.map((name, i) => ({ id: `pj${i + 1}`, name, xp: 0 })),
    milestones: [],
    capLifted: false,
    log: [],
    undo: null,
  };
}

export function combatShare(totalXp, participants) {
  return Math.ceil(totalXp / participants);
}

function snapshot(state) {
  return {
    characters: state.characters.map((c) => ({ ...c })),
    milestones: [...state.milestones],
    capLifted: state.capLifted,
  };
}

export function levelUps(before, after) {
  const ups = [];
  for (const c of after.characters) {
    const old = before.characters.find((b) => b.id === c.id);
    if (!old) continue;
    const from = effectiveLevel(old.xp, before.capLifted);
    const to = effectiveLevel(c.xp, after.capLifted);
    if (to > from) ups.push({ id: c.id, name: c.name, from, to });
  }
  return ups;
}

// partySize lets "everyone reaches the same level" read as one short line.
export function describeLevelUps(ups, partySize = 0) {
  if (ups.length > 1 && ups.length === partySize && ups.every((u) => u.to === ups[0].to)) {
    return `Todos suben a nivel ${ups[0].to}`;
  }
  return ups.map((u) => `${u.name} sube a nivel ${u.to}`).join(", ");
}

// Wraps a change: stores the undo snapshot, computes level-ups, appends the log line.
function commit(state, next, text) {
  const ups = levelUps(state, next);
  const line = ups.length ? `${text} → ${describeLevelUps(ups, next.characters.length)}` : text;
  return {
    state: {
      ...next,
      log: [...state.log, line].slice(-LOG_SIZE),
      undo: { ...snapshot(state), log: state.log },
    },
    levelUps: ups,
  };
}

function checkInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} tiene que ser un número entero positivo`);
  }
}

export function applyCombat(state, totalXp, participantIds = state.characters.map((c) => c.id), label = "Combate") {
  checkInteger(totalXp, "La XP del combate");
  if (totalXp === 0) throw new Error("La XP del combate tiene que ser mayor que 0");
  const ids = new Set(participantIds);
  const present = state.characters.filter((c) => ids.has(c.id));
  if (present.length === 0) throw new Error("Elige al menos un personaje presente");
  const share = combatShare(totalXp, present.length);
  const next = {
    ...state,
    characters: state.characters.map((c) => (ids.has(c.id) ? { ...c, xp: c.xp + share } : c)),
  };
  const who = present.length === state.characters.length ? "cada uno" : present.map((c) => c.name).join(", ");
  return commit(state, next, `${label}: ${totalXp} XP ÷ ${present.length} = +${share} (${who})`);
}

export function applyMilestone(state, milestoneId) {
  const m = MILESTONES.find((x) => x.id === milestoneId);
  if (!m) throw new Error(`Hito desconocido: ${milestoneId}`);
  if (state.milestones.includes(m.id)) throw new Error(`${m.id} ya está apuntado`);
  const raised = [];
  const characters = state.characters.map((c) => {
    let xp = c.xp + m.xp;
    if (m.minXp && xp < m.minXp) {
      xp = m.minXp;
      raised.push(c.name);
    }
    return { ...c, xp };
  });
  const next = {
    ...state,
    characters,
    milestones: [...state.milestones, m.id],
    capLifted: state.capLifted || Boolean(m.closesAdventure),
  };
  let text = `${m.id}: +${m.xp} a cada uno`;
  if (raised.length) text += ` (mínimo ${m.minXp}: ${raised.join(", ")})`;
  return commit(state, next, text);
}

export function setCapLifted(state, lifted) {
  if (state.capLifted === lifted) return { state, levelUps: [] };
  const text = lifted ? "Nivel 5 desbloqueado" : "Nivel 5 bloqueado de nuevo";
  return commit(state, { ...state, capLifted: lifted }, text);
}

export function setCharacterXp(state, id, xp) {
  checkInteger(xp, "La XP");
  const c = state.characters.find((x) => x.id === id);
  if (!c) throw new Error(`Personaje desconocido: ${id}`);
  if (c.xp === xp) return { state, levelUps: [] };
  const next = { ...state, characters: state.characters.map((x) => (x.id === id ? { ...x, xp } : x)) };
  return commit(state, next, `Ajuste a mano: ${c.name} ${c.xp} → ${xp}`);
}

// Renaming is cosmetic: no log line, no undo.
export function renameCharacter(state, id, name) {
  const clean = String(name).trim().slice(0, 30);
  if (!clean) return state;
  return { ...state, characters: state.characters.map((c) => (c.id === id ? { ...c, name: clean } : c)) };
}

export function undo(state) {
  if (!state.undo) return state;
  const { log, ...rest } = state.undo;
  // Keep names typed after the action; only numbers go back.
  const characters = rest.characters.map((c) => ({
    ...c,
    name: state.characters.find((x) => x.id === c.id)?.name ?? c.name,
  }));
  return { ...state, ...rest, characters, log, undo: null };
}

// Wipes XP, milestones and the cap but keeps the names; undoable like any action.
export function resetProgress(state) {
  const fresh = createState(state.characters.map((c) => c.name));
  return {
    state: { ...fresh, log: ["Empezamos de cero"], undo: { ...snapshot(state), log: state.log } },
    levelUps: [],
  };
}
