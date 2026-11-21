// Versteht zwei Formate – auch gemischt:
// 1) "Akkorde über dem Text" (so wie auf den meisten Webseiten)
// 2) ChordPro: [G]Text mit [D]Akkorden und {title: ...} Direktiven
import { isChord } from './music';

export interface Segment {
  chord?: string;
  text: string;
}

export type Line =
  | { kind: 'lyrics'; segments: Segment[] }
  | { kind: 'chords'; tokens: string[] }
  | { kind: 'section'; label: string }
  | { kind: 'comment'; text: string }
  | { kind: 'tab'; text: string }
  | { kind: 'empty' };

export interface SongMeta {
  title?: string;
  artist?: string;
  key?: string;
  capo?: number;
}

export interface ParsedSong {
  meta: SongMeta;
  lines: Line[];
  chords: string[]; // alle vorkommenden Akkorde, eindeutig, in Reihenfolge
}

// Zeichen in Akkordzeilen, die keine Akkorde sind, aber dort vorkommen dürfen
const FILLER_RE = /^(\|+|\|\|:|:\|\||-+|\/+|\.+|%|x\s?\d+|\d+\s?x|\(x?\d+x?\)|N\.?C\.?|→|->|\*+|\(|\))$/i;

export function isChordLine(line: string): boolean {
  const tokens = line.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  let chords = 0;
  for (const t of tokens) {
    if (FILLER_RE.test(t)) continue;
    // "Am|G" oder "Am-G" zusammengeschrieben
    const parts = t.split(/\|/).filter(Boolean);
    if (parts.length > 0 && parts.every((p) => isChord(p))) {
      chords += parts.length;
      continue;
    }
    return false;
  }
  return chords > 0;
}

const SECTION_WORDS =
  'intro|outro|verse|vers|strophe|chorus|refrain|bridge|pre[- ]?chorus|post[- ]?chorus|interlude|instrumental|solo|zwischenspiel|ende|end|coda|hook|break|tag|pre[- ]?refrain|überleitung';
const SECTION_RE = new RegExp(
  `^\\s*[\\[(]?\\s*((?:${SECTION_WORDS})(?:\\s*\\d+)?(?:\\s*[x×]\\s*\\d+)?)\\s*[\\])]?\\s*:?\\s*(.*)$`,
  'i',
);

const TAB_RE = /^\s*[A-Ga-g][#b]?\s*[|:][-\d|hpbrsx/\\~().*^ =]+$/;
const DIRECTIVE_RE = /^\s*\{\s*([\w-]+)\s*(?::\s*(.*?))?\s*\}\s*$/;
const INLINE_CHORD_RE = /\[([^\]]+)\]/g;
const CAPO_RE = /^\s*(?:capo|kapo)\s*[:.]?\s*(\d{1,2})\b/i;
const KEY_RE = /^\s*(?:key|tonart)\s*[:.]?\s*([A-H][#b]?m?)\b/i;

function capitalizeLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Akkordzeile + Textzeile darunter zu Segmenten verschmelzen */
export function mergeChordsAndLyrics(chordLine: string, lyricLine: string): Segment[] {
  const positions: { col: number; chord: string }[] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(chordLine))) {
    if (FILLER_RE.test(m[0]) && !isChord(m[0])) continue;
    for (const part of m[0].split('|').filter(Boolean)) {
      if (isChord(part)) positions.push({ col: m.index, chord: part });
    }
  }
  if (positions.length === 0) return [{ text: lyricLine }];

  // Leicht verrutschte Akkorde (1–2 Zeichen nach Wortanfang) an den Wortanfang rücken,
  // damit keine Lücke mitten im Wort entsteht.
  positions.forEach((p, i) => {
    const prevCol = i > 0 ? positions[i - 1].col : -1;
    const nextCol = i + 1 < positions.length ? positions[i + 1].col : Infinity;
    if (p.col <= 0 || p.col >= lyricLine.length) return;
    // Akkord steht auf dem Leerzeichen direkt vor einem Wort → aufs Wort schieben
    if (/\s/.test(lyricLine[p.col]) && /\s/.test(lyricLine[p.col - 1]) === false) {
      const ns = p.col + 1;
      if (ns < lyricLine.length && !/\s/.test(lyricLine[ns]) && ns < nextCol) p.col = ns;
      return;
    }
    if (/\s/.test(lyricLine[p.col - 1]) || /\s/.test(lyricLine[p.col])) return;
    let ws = p.col;
    while (ws > 0 && !/\s/.test(lyricLine[ws - 1])) ws--;
    if (p.col - ws <= 2 && ws > prevCol) p.col = ws;
  });

  const segments: Segment[] = [];
  if (positions[0].col > 0) {
    const pre = lyricLine.slice(0, positions[0].col);
    if (pre.length) segments.push({ text: pre });
  }
  positions.forEach((p, i) => {
    const end = i + 1 < positions.length ? positions[i + 1].col : undefined;
    // Gleiche Spalte (z.B. "Am|G") → leere Segmente
    const text = p.col < lyricLine.length ? lyricLine.slice(p.col, end) : '';
    segments.push({ chord: p.chord, text });
  });
  return segments;
}

function parseInlineChordPro(line: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  let pendingChord: string | undefined;
  INLINE_CHORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_CHORD_RE.exec(line))) {
    const text = line.slice(last, m.index);
    if (text.length || pendingChord) segments.push({ chord: pendingChord, text });
    pendingChord = m[1].trim();
    last = m.index + m[0].length;
  }
  const rest = line.slice(last);
  if (rest.length || pendingChord) segments.push({ chord: pendingChord, text: rest });
  return segments;
}

function hasInlineChords(line: string): boolean {
  INLINE_CHORD_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  let found = false;
  while ((m = INLINE_CHORD_RE.exec(line))) {
    if (!isChord(m[1].trim())) return false;
    found = true;
  }
  return found;
}

function chordTokens(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function parseSong(input: string): ParsedSong {
  const raw = input.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').replace(/ /g, ' ');
  const src = raw.split('\n');
  const lines: Line[] = [];
  const meta: SongMeta = {};
  let inTab = false;

  for (let i = 0; i < src.length; i++) {
    const line = src[i].replace(/\s+$/, '');

    // --- Tab-Blöcke (ChordPro) ---
    if (inTab) {
      if (/^\s*\{\s*(eot|end_of_tab)\s*\}\s*$/i.test(line)) inTab = false;
      else lines.push({ kind: 'tab', text: line });
      continue;
    }

    if (line.trim() === '') {
      if (lines.length && lines[lines.length - 1].kind !== 'empty') lines.push({ kind: 'empty' });
      continue;
    }

    // --- ChordPro-Direktiven ---
    const d = DIRECTIVE_RE.exec(line);
    if (d) {
      const name = d[1].toLowerCase();
      const val = (d[2] ?? '').trim();
      switch (name) {
        case 'title':
        case 't':
          meta.title = val;
          break;
        case 'subtitle':
        case 'st':
        case 'artist':
          meta.artist = val;
          break;
        case 'key':
          meta.key = val;
          break;
        case 'capo':
          meta.capo = parseInt(val, 10) || 0;
          break;
        case 'comment':
        case 'c':
        case 'ci':
        case 'comment_italic':
        case 'cb':
        case 'comment_box':
          lines.push({ kind: 'comment', text: val });
          break;
        case 'soc':
        case 'start_of_chorus':
          lines.push({ kind: 'section', label: val || 'Refrain' });
          break;
        case 'sov':
        case 'start_of_verse':
          lines.push({ kind: 'section', label: val || 'Strophe' });
          break;
        case 'sob':
        case 'start_of_bridge':
          lines.push({ kind: 'section', label: val || 'Bridge' });
          break;
        case 'sot':
        case 'start_of_tab':
          inTab = true;
          if (val) lines.push({ kind: 'section', label: val });
          break;
        default:
          break; // eoc, eov, unbekannte Direktiven ignorieren
      }
      continue;
    }

    // --- Meta-Zeilen wie "Capo: 2" oder "Tonart: G" ---
    const capo = CAPO_RE.exec(line);
    if (capo && line.trim().length < 40) {
      meta.capo = parseInt(capo[1], 10);
      continue; // wird oben als "Kapo"-Chip angezeigt
    }
    const key = KEY_RE.exec(line);
    if (key && line.trim().length < 30) {
      meta.key = key[1];
      continue;
    }

    // --- Tabulatur-Zeilen (e|---0---) ---
    if (TAB_RE.test(line) && line.includes('-')) {
      lines.push({ kind: 'tab', text: line });
      continue;
    }

    // --- [Verse 1], [Chorus] ... (aber nicht [Am]) ---
    const bracket = /^\s*\[([^\]]+)\]\s*$/.exec(line);
    if (bracket && !isChord(bracket[1].trim())) {
      lines.push({ kind: 'section', label: capitalizeLabel(bracket[1].trim()) });
      continue;
    }

    // --- Abschnittsnamen: "Chorus:", "Intro: Am G C" ---
    const sec = SECTION_RE.exec(line);
    if (sec && !hasInlineChords(line)) {
      const rest = sec[2];
      if (rest === '' || isChordLine(rest)) {
        lines.push({ kind: 'section', label: capitalizeLabel(sec[1].trim()) });
        if (rest) lines.push({ kind: 'chords', tokens: chordTokens(rest) });
        continue;
      }
    }

    // --- ChordPro inline: [G]Text [D]mehr ---
    if (hasInlineChords(line)) {
      const segs = parseInlineChordPro(line);
      if (segs.every((s) => !s.text.trim())) {
        lines.push({ kind: 'chords', tokens: segs.map((s) => s.chord!).filter(Boolean) });
      } else {
        lines.push({ kind: 'lyrics', segments: segs });
      }
      continue;
    }

    // --- Akkordzeile über Textzeile ---
    if (isChordLine(line)) {
      const next = src[i + 1]?.replace(/\s+$/, '');
      const nextIsLyric =
        next !== undefined &&
        next.trim() !== '' &&
        !isChordLine(next) &&
        !DIRECTIVE_RE.test(next) &&
        !TAB_RE.test(next) &&
        !/^\s*\[[^\]]+\]\s*$/.test(next) &&
        !(SECTION_RE.test(next) && /^\s*[[(]?\s*\S+(\s*\d+)?\s*[\])]?\s*:?\s*$/.test(next));
      if (nextIsLyric) {
        lines.push({ kind: 'lyrics', segments: mergeChordsAndLyrics(line, next) });
        i++;
      } else {
        lines.push({ kind: 'chords', tokens: chordTokens(line) });
      }
      continue;
    }

    // --- Normale Textzeile ---
    lines.push({ kind: 'lyrics', segments: [{ text: line }] });
  }

  while (lines.length && lines[lines.length - 1].kind === 'empty') lines.pop();
  while (lines.length && lines[0].kind === 'empty') lines.shift();

  // Alle Akkorde sammeln
  const seen = new Set<string>();
  const chords: string[] = [];
  const add = (c: string) => {
    const clean = c.replace(/^\(+|[)*]+$/g, '');
    if (isChord(clean) && !seen.has(clean)) {
      seen.add(clean);
      chords.push(clean);
    }
  };
  for (const l of lines) {
    if (l.kind === 'lyrics') l.segments.forEach((s) => s.chord && add(s.chord));
    if (l.kind === 'chords') l.tokens.forEach((t) => t.split('|').forEach(add));
  }

  return { meta, lines, chords };
}

/**
 * Versucht Titel und Interpret aus der ersten Zeile eines eingefügten Textes zu lesen,
 * z.B. "Wonderwall - Oasis" oder "Hallelujah by Leonard Cohen".
 */
export function guessTitleArtist(text: string): { title?: string; artist?: string; rest: string } {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  const idx = lines.findIndex((l) => l.trim() !== '');
  if (idx === -1) return { rest: text };
  const first = lines[idx].trim();
  if (first.length > 80 || isChordLine(first) || /[[{]/.test(first) || SECTION_RE.test(first)) {
    return { rest: text };
  }
  const m = /^(.+?)\s+(?:-|–|—|by|von)\s+(.+?)(?:\s+(?:chords|akkorde|tabs?).*)?$/i.exec(first);
  if (!m) return { rest: text };
  const rest = lines.slice(idx + 1).join('\n').replace(/^\n+/, '');
  return { title: m[1].trim(), artist: m[2].trim(), rest };
}
