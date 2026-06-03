// Mirrors the backend FractionalIndex — client computes positions locally
// for optimistic UI during drag-and-drop, then persists via PATCH.
const DEFAULT_STEP = 1

export function between(before: number | undefined, after: number | undefined): number {
  if (before === undefined && after === undefined) return DEFAULT_STEP
  if (before === undefined) return (after as number) - DEFAULT_STEP
  if (after === undefined) return before + DEFAULT_STEP
  return (before + after) / 2
}
