import { Path, Rect, Svg } from "@react-pdf/renderer";

export function IconPlay({ color = "#ffffff", size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d="M8 5.5L19 12L8 18.5V5.5Z" fill={color} />
    </Svg>
  );
}

export function IconChart({ color = "#ffffff", size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Rect x={4} y={13} width={3.2} height={7} rx={0.8} fill={color} />
      <Rect x={10.4} y={8} width={3.2} height={12} rx={0.8} fill={color} />
      <Rect x={16.8} y={4} width={3.2} height={16} rx={0.8} fill={color} />
    </Svg>
  );
}

export function IconTask({ color = "#ffffff", size = 12 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M4.5 12.5L9.3 17.3L19.5 6.5"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function IconPin({ color = "#ffffff", size = 10 }: { color?: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path
        d="M12 2C7.6 2 4 5.6 4 10c0 5.6 8 12 8 12s8-6.4 8-12c0-4.4-3.6-8-8-8Zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z"
        fill={color}
      />
    </Svg>
  );
}
