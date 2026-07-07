export function PitchSvg() {
  return (
    <svg
      viewBox="0 0 100 150"
      className="absolute inset-0 h-full w-full"
      preserveAspectRatio="none"
    >
      <g
        fill="none"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="0.4"
        vectorEffect="non-scaling-stroke"
      >
        <rect x="2" y="2" width="96" height="146" />
        <line x1="2" y1="75" x2="98" y2="75" />
        <circle cx="50" cy="75" r="9.15" />
        <circle cx="50" cy="75" r="0.6" fill="rgba(255,255,255,0.75)" />

        {/* Area grande y chica arriba */}
        <rect x="19" y="2" width="62" height="16.5" />
        <rect x="37" y="2" width="26" height="5.5" />
        <path d="M 40.85 18.5 A 9.15 9.15 0 0 0 59.15 18.5" />
        <circle cx="50" cy="13.5" r="0.6" fill="rgba(255,255,255,0.75)" />

        {/* Area grande y chica abajo */}
        <rect x="19" y="131.5" width="62" height="16.5" />
        <rect x="37" y="142.5" width="26" height="5.5" />
        <path d="M 40.85 131.5 A 9.15 9.15 0 0 1 59.15 131.5" />
        <circle cx="50" cy="136.5" r="0.6" fill="rgba(255,255,255,0.75)" />

        {/* Arcos de esquina */}
        <path d="M 2 4 A 2 2 0 0 0 4 2" />
        <path d="M 96 2 A 2 2 0 0 0 98 4" />
        <path d="M 98 144 A 2 2 0 0 0 96 146" />
        <path d="M 4 146 A 2 2 0 0 0 2 144" />
      </g>
    </svg>
  );
}
