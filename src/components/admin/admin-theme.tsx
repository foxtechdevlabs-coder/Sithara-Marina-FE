import type { CSSProperties } from "react";

/* Admin Figma typography and colours (admin code may not import user-area modules). */
export const SANS: CSSProperties = {
  fontFamily: "'Switzer', ui-sans-serif, system-ui, sans-serif",
};
export const INK = "#0d1b2a";
export const NAVY = "#0a1a2c";
export const CANVAS = "#f8f7f4";
export const SAND = "#f4efe8";
export const BODY = "#4a4f55";
export const MUTED = "#5f646a";
export const BORDER = "#e3e1dc";
export const GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)";

/** Switzer from Fontshare. React 19 hoists the stylesheet into <head>. */
export function AdminFonts() {
  return (
    <link
      rel="stylesheet"
      href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap"
      precedence="default"
    />
  );
}
