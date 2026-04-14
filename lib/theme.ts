// Palette centralisée - monochrome vert "terminal pro"
// Modifier ici pour changer les couleurs dans toute l'app

export const theme = {
  // Backgrounds
  bg:          "#0a0a0a",   // fond principal
  bgPanel:     "#0b0b0b",   // panneaux/headers
  bgElevated:  "#111",      // zones surélevées
  bgHover:     "#1a1a1a",   // hover
  bgActive:    "rgba(74,222,128,0.08)", // sélectionné

  // Borders
  border:       "#1a1a1a",
  borderStrong: "#2a2a2a",
  borderAccent: "rgba(74,222,128,0.35)",

  // Text
  text:        "#e5e5e5",
  textMuted:   "#888",
  textDim:     "#555",

  // Accent unique (actions, actifs, liens)
  accent:         "#4ade80",
  accentStrong:   "#22c55e",
  accentBg:       "rgba(74,222,128,0.08)",
  accentBgStrong: "rgba(74,222,128,0.18)",
  accentBorder:   "rgba(74,222,128,0.35)",

  // États
  success: "#22c55e",
  warning: "#f59e0b",          // ambre (remplace orange #fb923c)
  warningBg: "rgba(245,158,11,0.1)",
  danger:  "#ef4444",
  dangerBg: "rgba(239,68,68,0.1)",

  // Info (à utiliser rarement)
  info:    "#60a5fa",
} as const;

export type Theme = typeof theme;
