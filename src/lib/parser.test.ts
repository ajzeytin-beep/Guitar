import { describe, it, expect } from 'vitest';
import { parseSong, isChordLine, guessTitleArtist } from './parser';
import { transformChord, isChord } from './music';
import { getShape } from './shapes';

describe('Akkord-Erkennung', () => {
  it('erkennt Akkorde', () => {
    for (const c of ['C', 'Am', 'F#m7', 'Bb', 'Cmaj7', 'Dsus4', 'G/B', 'Em7b5', 'C(add9)', 'H7', 'A-'])
      expect(isChord(c), c).toBe(true);
  });
  it('lehnt Wörter ab', () => {
    for (const w of ['Am Morgen', 'Bein', 'Day', 'Hallo', 'Chorus', 'Ade'])
      expect(isChord(w), w).toBe(false);
  });
  it('erkennt Akkordzeilen', () => {
    expect(isChordLine('Am      F     C   G')).toBe(true);
    expect(isChordLine('G  D  | Em  C  x2')).toBe(true);
    expect(isChordLine('A little bit of love')).toBe(false);
    expect(isChordLine('Die Saiten sind kalt')).toBe(false);
  });
});

describe('Parser', () => {
  it('verbindet Akkord- und Textzeile', () => {
    const s = parseSong('Am       F\nHallo du schöne Welt');
    expect(s.lines[0]).toEqual({
      kind: 'lyrics',
      segments: [{ chord: 'Am', text: 'Hallo du ' }, { chord: 'F', text: 'schöne Welt' }],
    });
  });
  it('versteht ChordPro', () => {
    const s = parseSong('{title: Test}\n{capo: 2}\n[G]Hallo [D]Welt');
    expect(s.meta.title).toBe('Test');
    expect(s.meta.capo).toBe(2);
    expect(s.lines[0]).toEqual({
      kind: 'lyrics',
      segments: [{ chord: 'G', text: 'Hallo ' }, { chord: 'D', text: 'Welt' }],
    });
  });
  it('erkennt Abschnitte, Capo und Akkord-only-Zeilen', () => {
    const s = parseSong('Capo: 3\n\n[Verse 1]\nIntro: Am G C\nChorus:\nG    D\nla la la');
    expect(s.meta.capo).toBe(3);
    expect(s.lines.map((l) => l.kind)).toEqual(['section', 'section', 'chords', 'section', 'lyrics']);
    expect(s.chords).toEqual(['Am', 'G', 'C', 'D']);
  });
  it('Akkordzeile gefolgt von Akkordzeile', () => {
    const s = parseSong('G D\nEm C\ntext');
    expect(s.lines[0].kind).toBe('chords');
    expect(s.lines[1].kind).toBe('lyrics');
  });
  it('Titel aus erster Zeile', () => {
    const g = guessTitleArtist('Mein Lied - Meine Band Chords\nAm\ntext');
    expect(g.title).toBe('Mein Lied');
    expect(g.artist).toBe('Meine Band');
    expect(g.rest).toBe('Am\ntext');
  });
});

describe('Transponieren', () => {
  const o = (semitones: number, preferFlats = false) => ({ semitones, preferFlats, simplify: false });
  it('verschiebt Akkorde', () => {
    expect(transformChord('Am', o(2))).toBe('Bm');
    expect(transformChord('G/B', o(2))).toBe('A/C#');
    expect(transformChord('F#m7', o(-1))).toBe('Fm7');
    expect(transformChord('C', o(1, true))).toBe('Db');
    expect(transformChord('Bb', o(0))).toBe('Bb');
    expect(transformChord('H7', o(0))).toBe('B7');
  });
  it('vereinfacht', () => {
    expect(transformChord('Cmaj7', { semitones: 0, preferFlats: false, simplify: true })).toBe('C');
    expect(transformChord('Am7/G', { semitones: 0, preferFlats: false, simplify: true })).toBe('Am');
  });
});

describe('Griffbilder', () => {
  it('liefert offene und Barré-Griffe', () => {
    expect(getShape('C')!.frets).toEqual([-1, 3, 2, 0, 1, 0]);
    expect(getShape('F')!.frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(getShape('F')!.easy).toBe(false);
    expect(getShape('Bm')!.frets).toEqual([-1, 2, 4, 4, 3, 2]);
    expect(getShape('G/B')!.frets).toEqual([-1, 2, 0, 0, 0, 3]);
    expect(getShape('D/F#')!.frets).toEqual([2, -1, 0, 2, 3, 2]);
  });
});

describe('Verrutschte Akkorde', () => {
  it('rückt Akkord an Wortanfang', () => {
    const s = parseSong('F        G\nSpiel es nochmal');
    expect(s.lines[0]).toEqual({
      kind: 'lyrics',
      segments: [{ chord: 'F', text: 'Spiel es ' }, { chord: 'G', text: 'nochmal' }],
    });
  });
  it('lässt echte Silben-Akkorde stehen', () => {
    const s = parseSong('C        G\nwunderschön');
    expect((s.lines[0] as { segments: unknown[] }).segments).toEqual([
      { chord: 'C', text: 'wundersch' },
      { chord: 'G', text: 'ön' },
    ]);
  });
});

describe('Akkord auf Leerzeichen', () => {
  it('schiebt Akkord aufs nächste Wort', () => {
    const s = parseSong('F                  Bb\nWolken ziehen übers Dach,');
    expect(s.lines[0]).toEqual({
      kind: 'lyrics',
      segments: [{ chord: 'F', text: 'Wolken ziehen übers ' }, { chord: 'Bb', text: 'Dach,' }],
    });
  });
});
