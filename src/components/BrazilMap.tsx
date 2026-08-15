import { MISSIONS } from "@/game/levels";

// Stylised tactical radar map of Brazil with blinking mission pins.
const BRAZIL_PATH =
  "M120,60 L170,42 L210,58 L246,44 L268,66 L262,96 L286,110 L300,140 L282,168 L300,196 L286,226 L300,252 L286,286 L258,318 L232,352 L210,392 L176,404 L150,392 L138,360 L112,340 L92,306 L70,272 L58,232 L36,200 L44,164 L70,140 L72,104 L96,84 Z";

export function BrazilMap({
  unlocked,
  selected,
  onSelect,
}: {
  unlocked: number;
  selected: number | null;
  onSelect: (i: number) => void;
}) {
  return (
    <svg viewBox="0 0 340 440" className="h-full w-full" role="img" aria-label="Mapa tático do Brasil">
      <defs>
        <pattern id="grid" width="17" height="17" patternUnits="userSpaceOnUse">
          <path d="M17 0H0V17" fill="none" stroke="var(--radar-grid)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="340" height="440" fill="url(#grid)" />
      <path d={BRAZIL_PATH} fill="var(--radar-land)" stroke="var(--radar-line)" strokeWidth="2.5" />
      <path d={BRAZIL_PATH} fill="none" stroke="var(--radar-glow)" strokeWidth="6" opacity="0.25" />

      {MISSIONS.map((m, i) => {
        const next = MISSIONS[i + 1];
        if (!next) return null;
        return (
          <line
            key={`l${m.id}`}
            x1={m.pin.x * 340}
            y1={m.pin.y * 440}
            x2={next.pin.x * 340}
            y2={next.pin.y * 440}
            stroke="var(--radar-line)"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            opacity={i < unlocked ? 0.9 : 0.3}
          />
        );
      })}

      {MISSIONS.map((m, i) => {
        const locked = i > unlocked;
        const cx = m.pin.x * 340;
        const cy = m.pin.y * 440;
        return (
          <g
            key={m.id}
            transform={`translate(${cx} ${cy})`}
            onClick={() => !locked && onSelect(i)}
            style={{ cursor: locked ? "not-allowed" : "pointer" }}
          >
            {!locked && (
              <circle r="16" fill="none" stroke="var(--radar-ping)" strokeWidth="1.5" opacity="0.8">
                <animate attributeName="r" values="8;22" dur="1.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.9;0" dur="1.8s" repeatCount="indefinite" />
              </circle>
            )}
            <rect
              x="-7"
              y="-7"
              width="14"
              height="14"
              fill={locked ? "var(--radar-locked)" : selected === i ? "var(--radar-ping)" : "var(--radar-pin)"}
              stroke="var(--radar-line)"
              strokeWidth="1.5"
            />
            <text x="0" y="4" textAnchor="middle" fontSize="9" fill="var(--radar-bg)" fontWeight="700">
              {locked ? "✕" : i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
