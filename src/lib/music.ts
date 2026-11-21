// Grundlegende Musiktheorie: Akkorde erkennen, zerlegen und transponieren.

const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const BASE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11, H: 11 };

export function noteIndex(letter: string, accidental = ''): number {
  let n = BASE[letter.toUpperCase()];
  if (accidental === '#' || accidental === '♯') n += 1;
  if (accidental === 'b' || accidental === '♭') n -= 1;
  return (n + 12) % 12;
}

export function noteName(index: number, preferFlats: boolean): string {
  const i = ((index % 12) + 12) % 12;
  return (preferFlats ? FLATS : SHARPS)[i];
}

export interface Chord {
  root: number;
  rootName: string;
  quality: string; // alles nach dem Grundton, z.B. "m7", "sus4", "maj7"
  bass?: number;
  bassName?: string;
}

// Erlaubte Bestandteile nach dem Grundton
const QUALITY_RE =
  /^(?:maj|Maj|min|mi|m|M|dim|aug|sus|add|no|alt|°|ø|\+|-|Δ|\d+|b|#|♭|♯|\(|\)|,)*$/;
const CHORD_RE = /^([A-H])([#b♯♭]?)(.*?)(?:\/([A-H])([#b♯♭]?))?$/;

export function parseChord(raw: string): Chord | null {
  const s = raw.trim();
  const m = CHORD_RE.exec(s);
  if (!m) return null;
  const [, letter, acc, quality, bassLetter, bassAcc] = m;
  if (!QUALITY_RE.test(quality)) return null;
  // "-" alleine oder am Anfang z.B. "A-" (Moll-Schreibweise) erlauben, aber keine Wörter
  const chord: Chord = {
    root: noteIndex(letter, acc),
    rootName: letter + acc,
    quality,
  };
  if (bassLetter) {
    chord.bass = noteIndex(bassLetter, bassAcc);
    chord.bassName = bassLetter + bassAcc;
  }
  return chord;
}

export function isChord(token: string): boolean {
  const t = token.replace(/^\(+|\)+$/g, '').replace(/\*+$/, '');
  if (!t) return false;
  return parseChord(t) !== null;
}

export function isMinorQuality(q: string): boolean {
  return /^(m(?!aj)|min|mi|-)/.test(q);
}

/** Vereinfacht einen Akkord auf Dur/Moll(+7) – z.B. Cmaj7 → C, Am7 → Am, Dsus4 → D */
export function simplifyQuality(q: string): string {
  if (/^(dim|°)/.test(q)) return 'dim';
  if (isMinorQuality(q)) return 'm';
  return '';
}

export function chordToString(c: Chord, preferFlats: boolean, keepSpelling = false): string {
  const root = keepSpelling ? c.rootName : noteName(c.root, preferFlats);
  let s = root + c.quality;
  if (c.bass !== undefined) {
    s += '/' + (keepSpelling && c.bassName ? c.bassName : noteName(c.bass, preferFlats));
  }
  return s;
}

export interface ChordDisplayOptions {
  semitones: number;
  preferFlats: boolean;
  simplify: boolean;
}

/** Wandelt einen Akkord-String für die Anzeige um (transponieren, vereinfachen). */
export function transformChord(raw: string, opts: ChordDisplayOptions): string {
  const lead = raw.match(/^\(+/)?.[0] ?? '';
  const trail = raw.match(/[)*]+$/)?.[0] ?? '';
  const core = raw.slice(lead.length, raw.length - trail.length);
  const c = parseChord(core);
  if (!c) return raw;
  const shift = ((opts.semitones % 12) + 12) % 12;
  const out: Chord = {
    ...c,
    root: c.root + shift,
    bass: c.bass !== undefined ? c.bass + shift : undefined,
  };
  if (opts.simplify) {
    out.quality = simplifyQuality(c.quality);
    out.bass = undefined;
  }
  // H aus deutscher Schreibweise wird zu B normalisiert
  const keep = shift === 0 && !c.rootName.startsWith('H') && !c.bassName?.startsWith('H');
  return lead + chordToString(out, opts.preferFlats, keep) + trail;
}

// Tonarten, die man üblicherweise mit b schreibt
const FLAT_MAJOR = new Set([5, 10, 3, 8, 1, 6]); // F Bb Eb Ab Db Gb
const FLAT_MINOR = new Set([2, 7, 0, 5, 10, 3]); // Dm Gm Cm Fm Bbm Ebm

export function keyPrefersFlats(root: number, minor: boolean): boolean {
  const r = ((root % 12) + 12) % 12;
  return minor ? FLAT_MINOR.has(r) : FLAT_MAJOR.has(r);
}

export interface Key {
  root: number;
  minor: boolean;
}

export function parseKey(s: string | undefined): Key | null {
  if (!s) return null;
  const c = parseChord(s.trim().replace(/\s*(dur|major)$/i, '').replace(/\s*(moll|minor)$/i, 'm'));
  if (!c) return null;
  return { root: c.root, minor: isMinorQuality(c.quality) };
}

export function keyToString(k: Key, shift: number): string {
  const root = k.root + shift;
  return noteName(root, keyPrefersFlats(root, k.minor)) + (k.minor ? 'm' : '');
}
