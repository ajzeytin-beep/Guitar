import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_PREFS, loadSongs, newId, saveSongs, type Song, type SongPrefs } from './lib/storage';
import { Library } from './components/Library';
import { SongView } from './components/SongView';
import { Editor } from './components/Editor';

export type Theme = 'system' | 'light' | 'dark';

type Route = { name: 'library' } | { name: 'song'; id: string } | { name: 'edit'; id: string } | { name: 'new' };

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'song' && b) return { name: 'song', id: b };
  if (a === 'edit' && b) return { name: 'edit', id: b };
  if (a === 'new') return { name: 'new' };
  return { name: 'library' };
}

function go(path: string, replace = false) {
  if (replace) history.replaceState(null, '', '#/' + path);
  else location.hash = '/' + path;
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function loadTheme(): Theme {
  try {
    const t = localStorage.getItem('akkordbuch.theme');
    if (t === 'light' || t === 'dark') return t;
  } catch {
    /* ignorieren */
  }
  return 'system';
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>(loadSongs);
  const [route, setRoute] = useState<Route>(parseHash);
  const [theme, setTheme] = useState<Theme>(loadTheme);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('akkordbuch.theme', theme);
    } catch {
      /* ignorieren */
    }
  }, [theme]);

  const update = useCallback((fn: (s: Song[]) => Song[]) => {
    setSongs((prev) => {
      const next = fn(prev);
      if (!saveSongs(next)) alert('Speichern fehlgeschlagen – ist der Speicher voll?');
      return next;
    });
  }, []);

  const back = () => {
    if (history.length > 1) history.back();
    else go('', true);
  };

  if (route.name === 'new' || route.name === 'edit') {
    const existing = route.name === 'edit' ? songs.find((s) => s.id === route.id) : undefined;
    return (
      <Editor
        key={route.name === 'edit' ? route.id : 'new'}
        isNew={!existing}
        initial={existing}
        onCancel={back}
        onSave={({ title, artist, content, capo }) => {
          const now = Date.now();
          if (existing) {
            update((list) => list.map((s) => (s.id === existing.id ? { ...s, title, artist, content, updatedAt: now } : s)));
            go(`song/${existing.id}`, true);
          } else {
            const id = newId();
            const prefs: SongPrefs = { ...DEFAULT_PREFS, capo: capo ?? 0 };
            update((list) => [...list, { id, title, artist, content, createdAt: now, updatedAt: now, prefs }]);
            go(`song/${id}`, true);
          }
        }}
      />
    );
  }

  if (route.name === 'song') {
    const song = songs.find((s) => s.id === route.id);
    if (song) {
      return (
        <SongView
          key={song.id}
          song={song}
          onBack={() => go('')}
          onEdit={() => go(`edit/${song.id}`)}
          onDelete={() => {
            update((list) => list.filter((s) => s.id !== song.id));
            go('', true);
          }}
          onPrefs={(prefs) => update((list) => list.map((s) => (s.id === song.id ? { ...s, prefs } : s)))}
        />
      );
    }
  }

  return (
    <Library
      songs={songs}
      onOpen={(id) => go(`song/${id}`)}
      onNew={() => go('new')}
      onImport={(imported) =>
        update((list) => {
          const ids = new Set(list.map((s) => s.id));
          return [...list, ...imported.filter((s) => !ids.has(s.id))];
        })
      }
      theme={theme}
      onTheme={setTheme}
    />
  );
}
