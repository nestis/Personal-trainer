// Epley formula: 1RM = weight × (1 + reps / 30)
export function estimate1RM(kilos: number, reps: number): number {
  if (reps === 1) return kilos;
  return Math.round(kilos * (1 + reps / 30) * 10) / 10;
}
