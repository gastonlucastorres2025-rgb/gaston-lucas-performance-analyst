import { Font } from "@react-pdf/renderer";

export const COLORS = {
  blue: "#0b3d91",
  blueDark: "#072a66",
  blueTint: "#e6f1fb",
  red: "#d7263d",
  redTint: "#fcebeb",
  amber: "#b45309",
  amberTint: "#faeeda",
  green: "#0f6e56",
  greenTint: "#e1f5ee",
  gray: "#5f5e5a",
  grayTint: "#f1efe8",
  ink: "#1a1a1a",
  muted: "#6b6b68",
  border: "#e2e5ea",
};

let registered = false;

export function registerPdfFonts() {
  if (registered) return;
  registered = true;
  const base = typeof window !== "undefined" ? window.location.origin : "";
  Font.register({
    family: "Inter",
    fonts: [
      { src: `${base}/fonts/Inter-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/Inter-Medium.ttf`, fontWeight: 500 },
      { src: `${base}/fonts/Inter-SemiBold.ttf`, fontWeight: 600 },
      { src: `${base}/fonts/Inter-Bold.ttf`, fontWeight: 700 },
    ],
  });
}
