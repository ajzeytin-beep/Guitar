import { getShape } from '../lib/shapes';

interface Props {
  name: string;
  size?: number;
  onClick?: () => void;
}

const STRINGS = 6;
const FRETS = 5;

export function ChordDiagram({ name, size = 84, onClick }: Props) {
  const shape = getShape(name);
  const w = size;
  const h = size * 1.2;
  const padX = w * 0.16;
  const top = h * 0.2;
  const bottom = h * 0.06;
  const gridW = w - padX * 2;
  const gridH = h - top - bottom;
  const sx = gridW / (STRINGS - 1);
  const fy = gridH / FRETS;
  const dot = Math.min(sx, fy) * 0.36;

  const body = shape ? (
    <>
      {/* Sattel oder Bundangabe */}
      {shape.baseFret === 1 ? (
        <rect x={padX - 1} y={top - 3} width={gridW + 2} height={3.5} rx={1} className="cd-nut" />
      ) : (
        <text x={padX - 5} y={top + fy * 0.62} className="cd-fretnum" textAnchor="end">
          {shape.baseFret}
        </text>
      )}
      {Array.from({ length: FRETS + 1 }, (_, i) => (
        <line key={'f' + i} x1={padX} x2={padX + gridW} y1={top + i * fy} y2={top + i * fy} className="cd-line" />
      ))}
      {Array.from({ length: STRINGS }, (_, i) => (
        <line key={'s' + i} x1={padX + i * sx} x2={padX + i * sx} y1={top} y2={top + gridH} className="cd-line" />
      ))}
      {shape.barre && (
        <rect
          x={padX + shape.barre.from * sx - dot}
          y={top + (shape.barre.fret - shape.baseFret + 0.5) * fy - dot}
          width={(shape.barre.to - shape.barre.from) * sx + dot * 2}
          height={dot * 2}
          rx={dot}
          className="cd-dot"
        />
      )}
      {shape.frets.map((f, i) => {
        const x = padX + i * sx;
        if (f === -1)
          return (
            <text key={i} x={x} y={top - 7} className="cd-mark" textAnchor="middle">
              ×
            </text>
          );
        if (f === 0)
          return <circle key={i} cx={x} cy={top - 10} r={dot * 0.7} className="cd-open" />;
        if (shape.barre && f === shape.barre.fret && i >= shape.barre.from && i <= shape.barre.to) return null;
        return <circle key={i} cx={x} cy={top + (f - shape.baseFret + 0.5) * fy} r={dot} className="cd-dot" />;
      })}
    </>
  ) : (
    <text x={w / 2} y={h / 2} textAnchor="middle" className="cd-mark">
      ?
    </text>
  );

  const content = (
    <>
      <span className="cd-name">{name}</span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        {body}
      </svg>
    </>
  );

  return onClick ? (
    <button type="button" className="chord-diagram" onClick={onClick} aria-label={`Griff ${name}`}>
      {content}
    </button>
  ) : (
    <div className="chord-diagram" aria-label={`Griff ${name}`}>
      {content}
    </div>
  );
}
