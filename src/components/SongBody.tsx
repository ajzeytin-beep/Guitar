import { Fragment } from 'react';
import type { Line, Segment } from '../lib/parser';
import { isChord } from '../lib/music';

interface Props {
  lines: Line[];
  renderChord: (raw: string) => string;
  onChordTap?: (chord: string) => void;
}

/**
 * Teilt Segmente in Wörter auf, damit lange Zeilen auf schmalen Handys
 * sauber umbrechen und der Akkord trotzdem über der richtigen Silbe bleibt.
 */
function splitForWrap(seg: Segment): Segment[] {
  const parts = seg.text.match(/\S*\s*/g)?.filter(Boolean) ?? [];
  if (parts.length <= 1) return [seg];
  return parts.map((text, i) => (i === 0 ? { chord: seg.chord, text } : { text }));
}

export function SongBody({ lines, renderChord, onChordTap }: Props) {
  return (
    <div className="song-body">
      {lines.map((line, i) => {
        switch (line.kind) {
          case 'empty':
            return <div key={i} className="l-empty" />;
          case 'section':
            return (
              <div key={i} className="l-section">
                {line.label}
              </div>
            );
          case 'comment':
            return (
              <div key={i} className="l-comment">
                {line.text}
              </div>
            );
          case 'tab':
            return (
              <pre key={i} className="l-tab">
                {line.text}
              </pre>
            );
          case 'chords':
            return (
              <div key={i} className="l-chords">
                {line.tokens.map((t, j) => (
                  <Fragment key={j}>
                    {t.split('|').map((part, k, arr) => (
                      <Fragment key={k}>
                        {isChord(part) ? (
                          <button type="button" className="chord" onClick={() => onChordTap?.(part)}>
                            {renderChord(part)}
                          </button>
                        ) : (
                          part && <span className="chord-filler">{part}</span>
                        )}
                        {k < arr.length - 1 && <span className="chord-filler">|</span>}
                      </Fragment>
                    ))}
                  </Fragment>
                ))}
              </div>
            );
          case 'lyrics': {
            const hasChords = line.segments.some((s) => s.chord);
            if (!hasChords) {
              return (
                <div key={i} className="l-text">
                  {line.segments.map((s) => s.text).join('')}
                </div>
              );
            }
            return (
              <div key={i} className="l-lyrics">
                {line.segments.flatMap(splitForWrap).map((s, j) => (
                  <span key={j} className="seg">
                    <span className="seg-chord">
                      {s.chord ? (
                        <button type="button" className="chord" onClick={() => onChordTap?.(s.chord!)}>
                          {renderChord(s.chord)}
                        </button>
                      ) : (
                        ' '
                      )}
                    </span>
                    <span className="seg-text">{s.text || ' '}</span>
                  </span>
                ))}
              </div>
            );
          }
        }
      })}
    </div>
  );
}
