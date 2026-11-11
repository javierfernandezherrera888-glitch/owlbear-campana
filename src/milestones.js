// Story milestones of the table's XP rules. xp is per character; minXp is the
// safety net applied after the milestone. What each one is about stays out of
// this public code: the GM can paste their own notes, kept only in their browser.
export const MILESTONES = [
  { id: "H1", part: 1, xp: 25 },
  { id: "H2", part: 1, xp: 50 },
  { id: "H3", part: 2, xp: 25 },
  { id: "H4", part: 2, xp: 25 },
  { id: "H5", part: 2, xp: 50 },
  { id: "H6", part: 2, xp: 75 },
  { id: "H7", part: 2, xp: 50 },
  { id: "H8", part: 3, xp: 100 },
  { id: "H9", part: 3, xp: 100 },
  { id: "H10", part: 3, xp: 275, minXp: 2700 },
  { id: "H11", part: 4, xp: 150 },
  { id: "H12", part: 4, xp: 150 },
  { id: "H13", part: 4, xp: 1100, minXp: 6500, closesAdventure: true },
];

// Parses the GM's pasted notes: one per line, "H5 text" or "H5: text".
export function parseNotes(text) {
  const notes = {};
  for (const line of String(text).split(/\r?\n/)) {
    const match = line.match(/^\s*(H\d{1,2})\s*[:.\-–]?\s*(.+?)\s*$/i);
    if (match) notes[match[1].toUpperCase()] = match[2].slice(0, 120);
  }
  return notes;
}
