import { useMemo, useState, type ClipboardEvent } from 'react';
import { guessTitleArtist, parseSong } from '../lib/parser';
import { SongBody } from './SongBody';

interface Props {
  initial?: { title: string; artist: string; content: string };
  isNew: boolean;
  onCancel: () => void;
  onSave: (data: { title: string; artist: string; content: string; capo?: number }) => void;
}

const PLACEHOLDER = `Hier den Song einfügen – z.B. von einer Webseite kopiert:

[Strophe 1]
Am          F
So sieht es aus, wenn
C               G
Akkorde über dem Text stehen.

Oder im ChordPro-Format:
[Am]So sieht es [F]aus …`;

export function Editor({ initial, isNew, onCancel, onSave }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [artist, setArtist] = useState(initial?.artist ?? '');
  const [content, setContent] = useState(initial?.content ?? '');
  const [tab, setTab] = useState<'text' | 'preview'>('text');

  const parsed = useMemo(() => parseSong(content), [content]);
  const effectiveTitle = title.trim() || parsed.meta.title || '';

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    // Nur beim ersten Einfügen in ein leeres Feld Titel/Interpret erraten
    if (content.trim() || title.trim()) return;
    const text = e.clipboardData.getData('text/plain');
    const meta = parseSong(text).meta;
    if (meta.title) {
      setTitle(meta.title);
      if (meta.artist) setArtist(meta.artist);
      return;
    }
    const g = guessTitleArtist(text);
    if (g.title) {
      e.preventDefault();
      setTitle(g.title);
      if (g.artist && !artist) setArtist(g.artist);
      setContent(g.rest);
    }
  };

  const save = () => {
    onSave({
      title: effectiveTitle || 'Ohne Titel',
      artist: artist.trim() || parsed.meta.artist || '',
      content,
      capo: parsed.meta.capo,
    });
  };

  return (
    <div className="page editor">
      <header className="nav glass">
        <button type="button" className="nav-btn" onClick={onCancel}>
          Abbrechen
        </button>
        <div className="nav-title">{isNew ? 'Neuer Song' : 'Bearbeiten'}</div>
        <button type="button" className="nav-btn strong" onClick={save} disabled={!content.trim()}>
          Sichern
        </button>
      </header>

      <main className="editor-main">
        <div className="group fields">
          <input className="field" placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Titel" />
          <input className="field" placeholder="Interpret" value={artist} onChange={(e) => setArtist(e.target.value)} aria-label="Interpret" />
        </div>

        <div className="segmented wide" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'text'} className={tab === 'text' ? 'active' : ''} onClick={() => setTab('text')}>
            Text
          </button>
          <button type="button" role="tab" aria-selected={tab === 'preview'} className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
            Vorschau
          </button>
        </div>

        {tab === 'text' ? (
          <>
            <textarea
              className="song-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder={PLACEHOLDER}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Songtext mit Akkorden"
            />
            {content.trim() && (
              <p className="group-note">
                {parsed.chords.length > 0
                  ? `✓ ${parsed.chords.length} Akkorde erkannt: ${parsed.chords.slice(0, 12).join(' · ')}${parsed.chords.length > 12 ? ' …' : ''}`
                  : 'Noch keine Akkorde erkannt. Akkorde müssen in einer eigenen Zeile über dem Text oder in [eckigen] Klammern stehen.'}
              </p>
            )}
          </>
        ) : (
          <div className="preview card">
            {content.trim() ? (
              <SongBody lines={parsed.lines} renderChord={(c) => c} />
            ) : (
              <p className="group-note">Noch nichts eingefügt.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
