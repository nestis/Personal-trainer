// Epley formula: 1RM = weight × (1 + reps / 30)
export function estimate1RM(kilos: number, reps: number): number {
  if (reps === 1) return kilos;
  return Math.round(kilos * (1 + reps / 30) * 10) / 10;
}

/**
 * Heart-rate recovery: the drop from the heart rate at the end of the WOD
 * ("from") to the heart rate 2 minutes later ("to"). Undefined unless both exist.
 */
export function recoveryDrop(from: unknown, to: unknown): number | undefined {
  return typeof from === 'number' && typeof to === 'number' ? from - to : undefined;
}
