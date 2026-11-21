// Speicherung lokal im Browser – kein Server, keine Anmeldung nötig.

export interface SongPrefs {
  transpose: number;
  capo: number;
  fontScale: number;
  scrollSpeed: number;
  simplify: boolean;
  showDiagrams: boolean;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  content: string; // Originaltext wie eingefügt (Akkorde über Text oder ChordPro)
  createdAt: number;
  updatedAt: number;
  prefs: SongPrefs;
}

export const DEFAULT_PREFS: SongPrefs = {
  transpose: 0,
  capo: 0,
  fontScale: 1,
  scrollSpeed: 3,
  simplify: false,
  showDiagrams: true,
};

const KEY = 'akkordbuch.songs.v1';
const SEEDED = 'akkordbuch.seeded';

const DEMO = `Am                   F
Die Saiten sind noch kalt am Morgen,
C                    G
der Kaffee dampft am Fensterbrett.
Am              F
Ich spiel die Akkorde, die ich kenne,
C                       G
und plötzlich klingt es richtig nett.

[Refrain]
F        G        C        Am
Spiel es nochmal, ganz langsam,
F              G         C
bis die Finger es allein verstehn.
F        G        Em   Am
Spiel es nochmal, ganz leise,
Dm             G                C
und lass die Melodie nach Hause gehn.

[Strophe 2]
Am                  F
Ein Barré-Griff tut noch weh im Finger,
C                   G
doch jeder Tag wird etwas mehr.
Am                       F
Und wenn ich falsch bin, macht das nichts,
C                      G
das Lied verzeiht mir, bitte sehr.

[Outro]
F  G  C  Am  |  F  G  C`;

export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function loadSongs(): Song[] {
  const raw = safeGet(KEY);
  let songs: Song[] = [];
  if (raw) {
    try {
      songs = (JSON.parse(raw) as Song[]).map((s) => ({ ...s, prefs: { ...DEFAULT_PREFS, ...s.prefs } }));
    } catch {
      songs = [];
    }
  }
  if (!raw && !safeGet(SEEDED)) {
    const now = Date.now();
    songs = [
      {
        id: newId(),
        title: 'Spiel es nochmal',
        artist: 'Beispiel-Song',
        content: DEMO,
        createdAt: now,
        updatedAt: now,
        prefs: { ...DEFAULT_PREFS },
      },
    ];
    safeSet(SEEDED, '1');
    saveSongs(songs);
  }
  return songs;
}

export function saveSongs(songs: Song[]): boolean {
  return safeSet(KEY, JSON.stringify(songs));
}

export function exportBackup(songs: Song[]): void {
  const blob = new Blob([JSON.stringify({ app: 'akkordbuch', version: 1, songs }, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `akkordbuch-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readBackup(file: File): Promise<Song[]> {
  const data = JSON.parse(await file.text());
  const list: unknown[] = Array.isArray(data) ? data : data.songs;
  if (!Array.isArray(list)) throw new Error('Ungültige Datei');
  return list
    .filter((s): s is Song => typeof s === 'object' && s !== null && 'content' in s)
    .map((s) => ({
      ...s,
      id: s.id || newId(),
      title: s.title || 'Ohne Titel',
      artist: s.artist || '',
      createdAt: s.createdAt || Date.now(),
      updatedAt: s.updatedAt || Date.now(),
      prefs: { ...DEFAULT_PREFS, ...s.prefs },
    }));
}
