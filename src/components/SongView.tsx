import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Song, SongPrefs } from '../lib/storage';
import { parseSong } from '../lib/parser';
import { keyPrefersFlats, keyToString, parseChord, parseKey, isMinorQuality, transformChord, type Key } from '../lib/music';
import { getShape } from '../lib/shapes';
import { SongBody } from './SongBody';
import { ChordDiagram } from './ChordDiagram';
import { Sheet } from './Sheet';
import { IconBack, IconEdit, IconPause, IconPlay, IconSliders } from './Icons';

interface Props {
  song: Song;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPrefs: (prefs: SongPrefs) => void;
}

function mod12(n: number) {
  return ((n % 12) + 12) % 12;
}

function useAutoScroll(playing: boolean, pxPerSecond: number, onEnd: () => void) {
  const speedRef = useRef(pxPerSecond);
  speedRef.current = pxPerSecond;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let carry = 0;
    let lock: { release: () => Promise<void> } | null = null;
    // Bildschirm wach halten, solange gescrollt wird
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => {});
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      carry += speedRef.current * dt;
      const step = Math.floor(carry);
      if (step >= 1) {
        carry -= step;
        window.scrollBy(0, step);
      }
      const atEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atEnd) {
        onEnd();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lock?.release().catch(() => {});
    };
  }, [playing, onEnd]);
}

function Stepper({ value, onMinus, onPlus, label }: { value: string; onMinus: () => void; onPlus: () => void; label: string }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={onMinus} aria-label={`${label} verringern`}>
        −
      </button>
      <span className="stepper-value">{value}</span>
      <button type="button" onClick={onPlus} aria-label={`${label} erhöhen`}>
        +
      </button>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="row">
      <span>{label}</span>
      <input type="checkbox" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

export function SongView({ song, onBack, onEdit, onDelete, onPrefs }: Props) {
  const p = song.prefs;
  const parsed = useMemo(() => parseSong(song.content), [song.content]);
  const [playing, setPlaying] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tappedChord, setTappedChord] = useState<string | null>(null);

  const set = useCallback((patch: Partial<SongPrefs>) => onPrefs({ ...p, ...patch }), [onPrefs, p]);

  const metaCapo = parsed.meta.capo ?? 0;
  // Tonart: aus Angabe im Text, sonst erster Akkord
  const key: Key | null = useMemo(() => {
    const k = parseKey(parsed.meta.key);
    if (k) return k;
    const first = parsed.chords[0] ? parseChord(parsed.chords[0]) : null;
    return first ? { root: first.root, minor: isMinorQuality(first.quality) } : null;
  }, [parsed]);

  const shiftFor = useCallback((capo: number) => metaCapo + p.transpose - capo, [metaCapo, p.transpose]);
  const shift = shiftFor(p.capo);

  const renderFor = useCallback(
    (s: number) => {
      const preferFlats = key ? keyPrefersFlats(key.root + s, key.minor) : false;
      return (raw: string) => transformChord(raw, { semitones: s, preferFlats, simplify: p.simplify });
    },
    [key, p.simplify],
  );
  const renderChord = useMemo(() => renderFor(shift), [renderFor, shift]);

  const displayChords = useMemo(() => {
    const out: string[] = [];
    for (const c of parsed.chords) {
      const d = renderChord(c);
      if (!out.includes(d)) out.push(d);
    }
    return out;
  }, [parsed.chords, renderChord]);

  // Kapo-Tipp: Bei welchem Bund sind die meisten Griffe ohne Barré spielbar?
  const capoTip = useMemo(() => {
    if (parsed.chords.length === 0) return null;
    const score = (capo: number) => {
      const r = renderFor(shiftFor(capo));
      return parsed.chords.filter((c) => getShape(r(c))?.easy).length;
    };
    const current = score(p.capo);
    let best = p.capo;
    let bestScore = current;
    for (let c = 0; c <= 7; c++) {
      const s = score(c);
      if (s > bestScore) {
        best = c;
        bestScore = s;
      }
    }
    return best === p.capo ? null : { capo: best, easy: bestScore, total: parsed.chords.length };
  }, [parsed.chords, renderFor, shiftFor, p.capo]);

  const stop = useCallback(() => setPlaying(false), []);
  const pxPerSecond = (4 + p.scrollSpeed * 6) * p.fontScale;
  useAutoScroll(playing, pxPerSecond, stop);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [song.id]);

  const soundingKey = key ? keyToString(key, metaCapo + p.transpose) : null;
  const gripKey = key ? keyToString(key, shift) : null;

  return (
    <div className="page song-page">
      <header className="nav glass">
        <button type="button" className="nav-btn" onClick={onBack} aria-label="Zurück zur Liste">
          <IconBack />
          <span>Songs</span>
        </button>
        <div className="nav-title">{song.title}</div>
        <button type="button" className="nav-btn icon" onClick={onEdit} aria-label="Bearbeiten">
          <IconEdit />
        </button>
      </header>

      <main className="song-main" style={{ ['--fs' as string]: p.fontScale }}>
        <div className="song-head">
          <h1>{song.title}</h1>
          {song.artist && <p className="artist">{song.artist}</p>}
          <div className="chips">
            {soundingKey && <span className="chip">Tonart {soundingKey}</span>}
            {p.capo > 0 && <span className="chip accent">Kapo {p.capo}</span>}
            {p.capo > 0 && gripKey && <span className="chip">Griffe in {gripKey}</span>}
            {mod12(p.transpose) !== 0 && (
              <span className="chip">
                {p.transpose > 0 ? '+' : ''}
                {p.transpose} HT
              </span>
            )}
            {p.simplify && <span className="chip">Vereinfacht</span>}
          </div>
        </div>

        {p.showDiagrams && displayChords.length > 0 && (
          <div className="diagram-strip" aria-label="Akkorde in diesem Song">
            {displayChords.map((c) => (
              <ChordDiagram key={c} name={c} size={64} onClick={() => setTappedChord(c)} />
            ))}
          </div>
        )}

        <SongBody lines={parsed.lines} renderChord={renderChord} onChordTap={(c) => setTappedChord(renderChord(c))} />
        <div className="song-end" />
      </main>

      <div className="toolbar glass" role="toolbar" aria-label="Werkzeuge">
        <Stepper
          label="Transponieren"
          value={gripKey ?? (p.transpose > 0 ? `+${p.transpose}` : String(p.transpose))}
          onMinus={() => set({ transpose: p.transpose - 1 })}
          onPlus={() => set({ transpose: p.transpose + 1 })}
        />
        <button
          type="button"
          className={`play-btn ${playing ? 'on' : ''}`}
          onClick={() => setPlaying((v) => !v)}
          aria-label={playing ? 'Scrollen anhalten' : 'Automatisch scrollen'}
        >
          {playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="tool-btn" onClick={() => setSettingsOpen(true)} aria-label="Einstellungen">
          <IconSliders />
        </button>
      </div>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Anzeige">
        <div className="group">
          <div className="row">
            <span>Transponieren</span>
            <Stepper
              label="Transponieren"
              value={p.transpose > 0 ? `+${p.transpose}` : String(p.transpose)}
              onMinus={() => set({ transpose: p.transpose - 1 })}
              onPlus={() => set({ transpose: p.transpose + 1 })}
            />
          </div>
          <div className="row">
            <span>Kapo</span>
            <Stepper
              label="Kapo"
              value={p.capo === 0 ? 'aus' : `${p.capo}. Bund`}
              onMinus={() => set({ capo: Math.max(0, p.capo - 1) })}
              onPlus={() => set({ capo: Math.min(11, p.capo + 1) })}
            />
          </div>
          {capoTip && (
            <button type="button" className="row tip" onClick={() => set({ capo: capoTip.capo })}>
              <span>
                💡 Tipp: Mit Kapo {capoTip.capo === 0 ? 'aus' : `im ${capoTip.capo}. Bund`} sind {capoTip.easy} von{' '}
                {capoTip.total} Griffen ohne Barré
              </span>
              <span className="link-btn">Übernehmen</span>
            </button>
          )}
          {(p.transpose !== 0 || p.capo !== metaCapo) && (
            <button type="button" className="row" onClick={() => set({ transpose: 0, capo: metaCapo })}>
              <span className="link-btn">Original wiederherstellen</span>
            </button>
          )}
        </div>
        <p className="group-note">Der Klang bleibt gleich: Mit Kapo werden die Griffe automatisch umgerechnet.</p>

        <div className="group">
          <label className="row slider-row">
            <span>Schriftgröße</span>
            <input
              type="range"
              min={0.8}
              max={1.8}
              step={0.1}
              value={p.fontScale}
              onChange={(e) => set({ fontScale: Number(e.target.value) })}
            />
          </label>
          <label className="row slider-row">
            <span>Scroll-Tempo</span>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={p.scrollSpeed}
              onChange={(e) => set({ scrollSpeed: Number(e.target.value) })}
            />
          </label>
        </div>

        <div className="group">
          <Toggle label="Akkorde vereinfachen" checked={p.simplify} onChange={(v) => set({ simplify: v })} />
          <Toggle label="Griffbilder anzeigen" checked={p.showDiagrams} onChange={(v) => set({ showDiagrams: v })} />
        </div>
        <p className="group-note">„Vereinfachen“ macht z.B. aus Cmaj7 ein C und aus Am7 ein Am.</p>

        <div className="group">
          <button type="button" className="row" onClick={onEdit}>
            <span className="link-btn">Song bearbeiten</span>
          </button>
          <button
            type="button"
            className="row"
            onClick={() => {
              if (confirm(`„${song.title}“ wirklich löschen?`)) onDelete();
            }}
          >
            <span className="danger">Song löschen</span>
          </button>
        </div>
      </Sheet>

      <Sheet open={tappedChord !== null} onClose={() => setTappedChord(null)}>
        {tappedChord && (
          <div className="chord-detail">
            <ChordDiagram name={tappedChord} size={150} />
            {getShape(tappedChord)?.barre && <p className="group-note">Barré-Griff</p>}
          </div>
        )}
      </Sheet>
    </div>
  );
}
