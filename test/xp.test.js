import { describe, it, expect } from "vitest";
import { MILESTONES, parseNotes } from "../src/milestones.js";
import {
  applyCombat,
  applyMilestone,
  combatShare,
  createState,
  effectiveLevel,
  levelFromXp,
  renameCharacter,
  resetProgress,
  setCharacterXp,
  setCapLifted,
  undo,
  xpToNext,
  LOG_SIZE,
} from "../src/xp.js";

const xps = (state) => state.characters.map((c) => c.xp);

describe("levels", () => {
  it("uses the 300 / 900 / 2.700 / 6.500 thresholds", () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(299)).toBe(1);
    expect(levelFromXp(300)).toBe(2);
    expect(levelFromXp(900)).toBe(3);
    expect(levelFromXp(2699)).toBe(3);
    expect(levelFromXp(2700)).toBe(4);
    expect(levelFromXp(6500)).toBe(5);
  });

  it("holds level 5 back until the cap is lifted", () => {
    expect(effectiveLevel(7000, false)).toBe(4);
    expect(effectiveLevel(7000, true)).toBe(5);
    expect(effectiveLevel(2700, false)).toBe(4);
  });

  it("tells how much XP is left for the next level", () => {
    expect(xpToNext(0)).toBe(300);
    expect(xpToNext(2650)).toBe(50);
    expect(xpToNext(20000)).toBeNull();
  });
});

describe("combat", () => {
  it("splits the total between the 4 characters, rounding up", () => {
    expect(combatShare(1250, 4)).toBe(313);
    const { state } = applyCombat(createState(), 250);
    expect(xps(state)).toEqual([63, 63, 63, 63]);
  });

  it("splits only between the characters present", () => {
    const s = createState();
    const { state } = applyCombat(s, 300, ["pj1", "pj2", "pj3"]);
    expect(xps(state)).toEqual([100, 100, 100, 0]);
    expect(state.log.at(-1)).toContain("÷ 3");
  });

  it("rejects bad input", () => {
    const s = createState();
    expect(() => applyCombat(s, 0)).toThrow();
    expect(() => applyCombat(s, -5)).toThrow();
    expect(() => applyCombat(s, 12.5)).toThrow();
    expect(() => applyCombat(s, 100, [])).toThrow();
  });

  it("reports who levels up", () => {
    const s = setCharacterXp(createState(), "pj1", 250).state;
    const { levelUps, state } = applyCombat(s, 200);
    expect(levelUps).toEqual([{ id: "pj1", name: "Personaje 1", from: 1, to: 2 }]);
    expect(state.log.at(-1)).toContain("Personaje 1 sube a nivel 2");
  });
});

describe("milestones", () => {
  it("adds the fixed XP to every character, once", () => {
    const { state } = applyMilestone(createState(), "H2");
    expect(xps(state)).toEqual([50, 50, 50, 50]);
    expect(() => applyMilestone(state, "H2")).toThrow(/ya está apuntado/);
    expect(() => applyMilestone(state, "H99")).toThrow();
  });

  it("sums to 2.175 per character, as the rules say", () => {
    expect(MILESTONES.reduce((sum, m) => sum + m.xp, 0)).toBe(2175);
  });

  it("H10 raises anyone below 2.700 to 2.700", () => {
    let s = createState();
    s = setCharacterXp(s, "pj1", 1000).state;
    s = setCharacterXp(s, "pj2", 2600).state;
    s = setCharacterXp(s, "pj3", 3000).state;
    const { state, levelUps } = applyMilestone(s, "H10");
    // 1000+275 → 2700, 2600+275 = 2875, 3000+275 = 3275, 0+275 → 2700
    expect(xps(state)).toEqual([2700, 2875, 3275, 2700]);
    expect(levelUps.map((u) => u.id)).toEqual(["pj1", "pj2", "pj4"]);
    expect(state.log.at(-1)).toContain("mínimo 2700: Personaje 1, Personaje 4");
  });

  it("says 'Todos' when the whole party reaches the same level", () => {
    const { state } = applyMilestone(createState(), "H10");
    expect(state.log.at(-1)).toContain("Todos suben a nivel 4");
  });

  it("H13 raises to 6.500 and lifts the cap", () => {
    let s = createState();
    s = setCharacterXp(s, "pj1", 5413).state;
    s = setCharacterXp(s, "pj2", 7000).state;
    const { state, levelUps } = applyMilestone(s, "H13");
    expect(xps(state)).toEqual([6513, 8100, 6500, 6500]);
    expect(state.capLifted).toBe(true);
    expect(levelUps.every((u) => u.to === 5)).toBe(true);
    expect(levelUps).toHaveLength(4);
  });

  it("the main-plot pace of the rules ends at 6.513 and level 5", () => {
    // Combat XP per character from the rules table: parts 1-4 main plot.
    let s = createState();
    for (const total of [1250, 2800, 3700, 9600]) s = applyCombat(s, total).state;
    for (const m of MILESTONES) s = applyMilestone(s, m.id).state;
    expect(xps(s)[0]).toBe(313 + 700 + 925 + 2400 + 2175);
    expect(effectiveLevel(s.characters[0].xp, s.capLifted)).toBe(5);
  });
});

describe("level 5 cap", () => {
  it("keeps counting XP but announces level 5 only when the cap is lifted", () => {
    let s = setCharacterXp(createState(), "pj1", 6400).state;
    const combat = applyCombat(s, 800);
    expect(combat.state.characters[0].xp).toBe(6600);
    expect(combat.levelUps).toEqual([]);
    const faced = setCapLifted(combat.state, true);
    expect(faced.levelUps.map((u) => u.id)).toEqual(["pj1"]);
    expect(faced.levelUps[0].to).toBe(5);
  });

  it("setting the same value is a no-op", () => {
    const s = createState();
    expect(setCapLifted(s, false).state).toBe(s);
  });
});

describe("undo and log", () => {
  it("undoes the last action only", () => {
    const a = applyMilestone(createState(), "H1").state;
    const b = applyCombat(a, 400).state;
    const back = undo(b);
    expect(xps(back)).toEqual([25, 25, 25, 25]);
    expect(back.milestones).toEqual(["H1"]);
    expect(back.log).toEqual(a.log);
    expect(undo(back)).toBe(back);
  });

  it("undoing a milestone frees it again and keeps new names", () => {
    let s = applyMilestone(createState(), "H13").state;
    s = renameCharacter(s, "pj1", "Thorin");
    const back = undo(s);
    expect(back.milestones).toEqual([]);
    expect(back.capLifted).toBe(false);
    expect(back.characters[0].name).toBe("Thorin");
  });

  it("keeps the log short so room metadata stays small", () => {
    let s = createState(["Nombre largo de personaje 1", "Nombre largo 2", "Nombre largo 3", "Nombre largo 4"]);
    for (let i = 0; i < 40; i++) s = applyCombat(s, 1000 + i, ["pj1", "pj2", "pj3"], "Combate muy largo").state;
    expect(s.log).toHaveLength(LOG_SIZE);
    // Room metadata is limited to 16 kB for all extensions together.
    expect(new TextEncoder().encode(JSON.stringify(s)).length).toBeLessThan(4096);
  });
});

describe("rename", () => {
  it("trims and ignores empty names", () => {
    const s = createState();
    expect(renameCharacter(s, "pj1", "  Lia  ").characters[0].name).toBe("Lia");
    expect(renameCharacter(s, "pj1", "   ")).toBe(s);
  });
});

describe("reset", () => {
  it("clears XP, milestones and cap, keeps names, and can be undone", () => {
    let s = renameCharacter(createState(), "pj1", "Lia");
    s = applyMilestone(s, "H13").state;
    const { state } = resetProgress(s);
    expect(xps(state)).toEqual([0, 0, 0, 0]);
    expect(state.milestones).toEqual([]);
    expect(state.capLifted).toBe(false);
    expect(state.characters[0].name).toBe("Lia");
    expect(state.log).toEqual(["Empezamos de cero"]);
    expect(undo(state).milestones).toEqual(["H13"]);
  });
});

describe("GM notes and spoilers", () => {
  it("parses one note per line", () => {
    expect(parseNotes(["H1 Primera", "h2: Segunda", "", "basura", "H13 - Final"].join("\n"))).toEqual({ H1: "Primera", H2: "Segunda", H13: "Final" });
  });

  it("keeps milestone texts out of the public code", () => {
    for (const m of MILESTONES) expect(Object.keys(m)).not.toContain("text");
  });
});
