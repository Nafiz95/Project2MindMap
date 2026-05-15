export type CatStyle = { fg: string; bg: string };

const catalog: Record<string, CatStyle> = {
  "Clinical Problem": { fg: "oklch(0.42 0.10 25)",  bg: "oklch(0.93 0.04 25)" },
  "Dataset":          { fg: "oklch(0.42 0.10 250)", bg: "oklch(0.93 0.04 250)" },
  "Cohort":           { fg: "oklch(0.42 0.10 250)", bg: "oklch(0.93 0.04 250)" },
  "Model":            { fg: "oklch(0.42 0.10 295)", bg: "oklch(0.93 0.04 295)" },
  "Method":           { fg: "oklch(0.42 0.10 165)", bg: "oklch(0.93 0.04 165)" },
  "Experiment":       { fg: "oklch(0.42 0.10 130)", bg: "oklch(0.93 0.04 130)" },
  "Implementation":   { fg: "oklch(0.42 0.10 90)",  bg: "oklch(0.93 0.04 90)" },
  "Evaluation":       { fg: "oklch(0.42 0.10 60)",  bg: "oklch(0.93 0.04 60)" },
  "Writing":          { fg: "oklch(0.42 0.10 320)", bg: "oklch(0.93 0.04 320)" },
  "Grant":            { fg: "oklch(0.42 0.10 320)", bg: "oklch(0.93 0.04 320)" },
  "Paper":            { fg: "oklch(0.42 0.10 320)", bg: "oklch(0.93 0.04 320)" },
  "Limitation":       { fg: "oklch(0.42 0.12 25)",  bg: "oklch(0.93 0.05 25)" },
  "Open Question":    { fg: "oklch(0.42 0.10 60)",  bg: "oklch(0.93 0.04 60)" },
  "Running Log":      { fg: "oklch(0.42 0.02 90)",  bg: "oklch(0.93 0.01 90)" },
  "Source":           { fg: "oklch(0.42 0.02 90)",  bg: "oklch(0.93 0.01 90)" },
  "Root":             { fg: "oklch(0.42 0.00 90)",  bg: "oklch(0.95 0.00 90)" },
};

export function catStyle(category: string): CatStyle {
  return catalog[category] ?? { fg: "oklch(0.42 0.02 90)", bg: "oklch(0.93 0.01 90)" };
}

export const WRITING_CATEGORIES = new Set(["Writing", "Grant", "Paper"]);
