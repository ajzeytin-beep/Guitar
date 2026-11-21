// Griffbilder für Gitarre (Standardstimmung). Saiten von tief E bis hoch e.
// -1 = nicht anschlagen, 0 = leer, n = Bund
import { parseChord, isMinorQuality } from './music';

export interface Shape {
  frets: number[];
  baseFret: number; // erster angezeigter Bund
  barre?: { fret: number; from: number; to: number };
  easy: boolean; // ohne Barré spielbar
}

type Q = 'maj' | 'm' | '7' | 'm7' | 'maj7' | 'sus2' | 'sus4' | 'dim' | 'aug' | '6' | 'm6' | 'm7b5' | 'add9' | '9';

export function normalizeQuality(q: string): Q {
  const s = q.replace(/[()]/g, '');
  if (s === '' || s === 'M' || s === 'maj') return 'maj';
  if (/^(m7b5|ø|mi7b5|min7b5|-7b5)/.test(s)) return 'm7b5';
  if (/^(dim|°)/.test(s)) return 'dim';
  if (/^(aug|\+)/.test(s)) return 'aug';
  if (/^(maj|M|Δ)/.test(s)) return 'maj7';
  if (isMinorQuality(s)) {
    const rest = s.replace(/^(min|mi|m|-)/, '');
    if (/^(7|9|11|13)/.test(rest)) return 'm7';
    if (/^6/.test(rest)) return 'm6';
    return 'm';
  }
  if (/^sus2/.test(s)) return 'sus2';
  if (/^sus/.test(s)) return 'sus4';
  if (/^add9|^add2|^2$/.test(s)) return 'add9';
  if (/^6/.test(s)) return '6';
  if (/^9/.test(s)) return '9';
  if (/^(7|11|13)/.test(s)) return '7';
  if (/^5$/.test(s)) return 'maj';
  return 'maj';
}

// Offene Griffe (die "Lagerfeuer-Akkorde")
const OPEN: Record<string, number[]> = {
  'C:maj': [-1, 3, 2, 0, 1, 0],
  'C:7': [-1, 3, 2, 3, 1, 0],
  'C:maj7': [-1, 3, 2, 0, 0, 0],
  'C:add9': [-1, 3, 2, 0, 3, 0],
  'C:sus2': [-1, 3, 0, 0, 1, 0],
  'C:sus4': [-1, 3, 3, 0, 1, 1],
  'C:6': [-1, 3, 2, 2, 1, 0],
  'D:maj': [-1, -1, 0, 2, 3, 2],
  'D:m': [-1, -1, 0, 2, 3, 1],
  'D:7': [-1, -1, 0, 2, 1, 2],
  'D:m7': [-1, -1, 0, 2, 1, 1],
  'D:maj7': [-1, -1, 0, 2, 2, 2],
  'D:sus2': [-1, -1, 0, 2, 3, 0],
  'D:sus4': [-1, -1, 0, 2, 3, 3],
  'D:add9': [-1, -1, 0, 2, 3, 0],
  'D:6': [-1, -1, 0, 2, 0, 2],
  'D:9': [-1, -1, 0, 2, 1, 0],
  'E:maj': [0, 2, 2, 1, 0, 0],
  'E:m': [0, 2, 2, 0, 0, 0],
  'E:7': [0, 2, 0, 1, 0, 0],
  'E:m7': [0, 2, 0, 0, 0, 0],
  'E:maj7': [0, 2, 1, 1, 0, 0],
  'E:sus4': [0, 2, 2, 2, 0, 0],
  'E:add9': [0, 2, 2, 1, 0, 2],
  'E:m6': [0, 2, 2, 0, 2, 0],
  'E:6': [0, 2, 2, 1, 2, 0],
  'F:maj7': [-1, -1, 3, 2, 1, 0],
  'G:maj': [3, 2, 0, 0, 0, 3],
  'G:7': [3, 2, 0, 0, 0, 1],
  'G:maj7': [3, 2, 0, 0, 0, 2],
  'G:sus4': [3, 3, 0, 0, 1, 3],
  'G:add9': [3, 0, 0, 2, 0, 3],
  'G:6': [3, 2, 0, 0, 0, 0],
  'A:maj': [-1, 0, 2, 2, 2, 0],
  'A:m': [-1, 0, 2, 2, 1, 0],
  'A:7': [-1, 0, 2, 0, 2, 0],
  'A:m7': [-1, 0, 2, 0, 1, 0],
  'A:maj7': [-1, 0, 2, 1, 2, 0],
  'A:sus2': [-1, 0, 2, 2, 0, 0],
  'A:sus4': [-1, 0, 2, 2, 3, 0],
  'A:add9': [-1, 0, 2, 4, 2, 0],
  'A:6': [-1, 0, 2, 2, 2, 2],
  'A:m6': [-1, 0, 2, 2, 1, 2],
  'A:dim': [-1, 0, 1, 2, 1, -1],
  'A:m7b5': [-1, 0, 1, 0, 1, -1],
  'A:9': [-1, 0, 2, 4, 2, 3],
  'B:7': [-1, 2, 1, 2, 0, 2],
};

// Verschiebbare Barré-Formen: E-Form (Grundton 6. Saite), A-Form (Grundton 5. Saite)
const E_FORM: Partial<Record<Q, number[]>> = {
  maj: [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
  m6: [0, 2, 2, 0, 2, 0],
  '9': [0, 2, 0, 1, 0, 2],
};
const A_FORM: Partial<Record<Q, number[]>> = {
  maj: [-1, 0, 2, 2, 2, 0],
  m: [-1, 0, 2, 2, 1, 0],
  '7': [-1, 0, 2, 0, 2, 0],
  m7: [-1, 0, 2, 0, 1, 0],
  maj7: [-1, 0, 2, 1, 2, 0],
  sus2: [-1, 0, 2, 2, 0, 0],
  sus4: [-1, 0, 2, 2, 3, 0],
  dim: [-1, 0, 1, 2, 1, -1],
  aug: [-1, 0, 3, 2, 2, 1],
  '6': [-1, 0, 2, 2, 2, 2],
  m6: [-1, 0, 2, 2, 1, 2],
  m7b5: [-1, 0, 1, 0, 1, -1],
  add9: [-1, 0, 2, 4, 2, 0],
  '9': [-1, 0, 2, 4, 2, 3],
};

const ROOT_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function finish(frets: number[], barreFret?: number, rootString?: number): Shape {
  const pressed = frets.filter((f) => f > 0);
  const max = pressed.length ? Math.max(...pressed) : 0;
  const min = pressed.length ? Math.min(...pressed) : 0;
  const baseFret = max <= 4 ? 1 : min;
  let barre: Shape['barre'];
  if (barreFret && barreFret > 0 && rootString !== undefined) {
    // Barré über alle Saiten ab Grundton-Saite, die diesen Bund haben
    let to = rootString;
    for (let s = rootString; s < 6; s++) if (frets[s] === barreFret) to = s;
    if (to > rootString) barre = { fret: barreFret, from: rootString, to };
  }
  return { frets, baseFret, barre, easy: !barre };
}

const cache = new Map<string, Shape | null>();

export function getShape(chordName: string): Shape | null {
  if (cache.has(chordName)) return cache.get(chordName)!;
  const c = parseChord(chordName.replace(/^\(+|[)*]+$/g, ''));
  if (!c) {
    cache.set(chordName, null);
    return null;
  }
  const q = normalizeQuality(c.quality);
  const rootName = ROOT_NAMES[c.root];
  let shape: Shape | null = null;

  const open = OPEN[`${rootName}:${q}`];
  if (open) shape = finish(open);
  else {
    const candidates: Shape[] = [];
    const eT = E_FORM[q];
    const aT = A_FORM[q];
    const eFret = (c.root - 4 + 12) % 12;
    const aFret = (c.root - 9 + 12) % 12;
    if (eT) candidates.push(finish(eT.map((f) => (f < 0 ? -1 : f + eFret)), eFret, 0));
    if (aT) candidates.push(finish(aT.map((f) => (f < 0 ? -1 : f + aFret)), aFret, 1));
    candidates.sort((x, y) => Math.max(...x.frets) - Math.max(...y.frets));
    shape = candidates[0] ?? null;
  }

  // Basston (Slash-Akkord) – wenn möglich auf tiefster Saite ergänzen
  // (nur bei offenen Griffen, z.B. C/G, D/F#, G/B, Am/G)
  if (shape && shape.easy && c.bass !== undefined && c.bass !== c.root) {
    const frets = [...shape.frets];
    const onE = (c.bass - 4 + 12) % 12;
    const onA = (c.bass - 9 + 12) % 12;
    if (onE <= 3) frets[0] = onE;
    else if (onA <= 3) {
      frets[1] = onA;
      frets[0] = -1;
    }
    shape = finish(frets);
  }

  cache.set(chordName, shape);
  return shape;
}
