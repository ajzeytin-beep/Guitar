import { useMemo, useRef, useState } from 'react';
import type { Song } from '../lib/storage';
import { exportBackup, readBackup } from '../lib/storage';
import { IconChevron, IconMore, IconMusic, IconPlus, IconSearch } from './Icons';
import { Sheet } from './Sheet';
import type { Theme } from '../App';

interface Props {
  songs: Song[];
  onOpen: (id: string) => void;
  onNew: () => void;
  onImport: (songs: Song[]) => void;
  theme: Theme;
  onTheme: (t: Theme) => void;
}

type Sort = 'title' | 'artist' | 'recent';

function initials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

export function Library({ songs, onOpen, onNew, onImport, theme, onTheme }: Props) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('title');
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? songs.filter((s) => `${s.title} ${s.artist} ${s.content}`.toLowerCase().includes(q))
      : songs;
    return [...filtered].sort((a, b) => {
      if (sort === 'recent') return b.updatedAt - a.updatedAt;
      if (sort === 'artist') return (a.artist || '~').localeCompare(b.artist || '~', 'de') || a.title.localeCompare(b.title, 'de');
      return a.title.localeCompare(b.title, 'de');
    });
  }, [songs, query, sort]);

  return (
    <div className="page library">
      <header className="nav glass">
        <button type="button" className="nav-btn icon" onClick={() => setMenuOpen(true)} aria-label="Mehr">
          <IconMore />
        </button>
        <div />
        <button type="button" className="nav-btn icon" onClick={onNew} aria-label="Neuer Song">
          <IconPlus />
        </button>
      </header>

      <main className="lib-main">
        <h1 className="large-title">Songs</h1>

        <div className="search">
          <IconSearch width={18} height={18} />
          <input
            type="search"
            placeholder="Titel, Interpret oder Text suchen"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Suchen"
          />
        </div>

        <div className="segmented" role="tablist" aria-label="Sortierung">
          {(
            [
              ['title', 'Titel'],
              ['artist', 'Interpret'],
              ['recent', 'Zuletzt'],
            ] as [Sort, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={sort === k} className={sort === k ? 'active' : ''} onClick={() => setSort(k)}>
              {label}
            </button>
          ))}
        </div>

        {songs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <IconMusic width={36} height={36} />
            </div>
            <h2>Noch keine Songs</h2>
            <p>Kopiere einen Song mit Akkorden von einer Webseite und füge ihn hier ein.</p>
            <button type="button" className="btn-primary" onClick={onNew}>
              Ersten Song hinzufügen
            </button>
          </div>
        ) : list.length === 0 ? (
          <p className="no-results">Keine Treffer für „{query}“</p>
        ) : (
          <ul className="song-list">
            {list.map((s) => (
              <li key={s.id}>
                <button type="button" className="song-item" onClick={() => onOpen(s.id)}>
                  <span className="song-avatar" aria-hidden="true">
                    {initials(s.title) || '♪'}
                  </span>
                  <span className="song-info">
                    <span className="song-title">{s.title}</span>
                    <span className="song-artist">{s.artist || 'Unbekannt'}</span>
                  </span>
                  <IconChevron className="chev" width={18} height={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="count">{songs.length === 1 ? '1 Song' : `${songs.length} Songs`}</p>
      </main>

      <Sheet open={menuOpen} onClose={() => setMenuOpen(false)} title="Einstellungen">
        <p className="group-label">Darstellung</p>
        <div className="segmented wide">
          {(
            [
              ['system', 'Automatisch'],
              ['light', 'Hell'],
              ['dark', 'Dunkel'],
            ] as [Theme, string][]
          ).map(([k, label]) => (
            <button key={k} type="button" className={theme === k ? 'active' : ''} onClick={() => onTheme(k)}>
              {label}
            </button>
          ))}
        </div>

        <p className="group-label">Daten</p>
        <div className="group">
          <button type="button" className="row" onClick={() => exportBackup(songs)}>
            <span className="link-btn">Backup exportieren</span>
          </button>
          <button type="button" className="row" onClick={() => fileRef.current?.click()}>
            <span className="link-btn">Backup importieren</span>
          </button>
        </div>
        <p className="group-note">Deine Songs werden nur auf diesem Gerät gespeichert. Mit einem Backup kannst du sie auf ein anderes Gerät übertragen.</p>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const imported = await readBackup(f);
              onImport(imported);
              alert(`${imported.length} Songs importiert`);
              setMenuOpen(false);
            } catch {
              alert('Die Datei konnte nicht gelesen werden.');
            }
          }}
        />
      </Sheet>
    </div>
  );
}
