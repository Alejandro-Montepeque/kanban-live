/**
 * Compute a fractional position between two existing positions.
 *
 * Used by the Kanban board to insert a card between two siblings without
 * having to renumber every card in the column. The contract is simple:
 *
 *   between(undefined, undefined) -> 1
 *   between(undefined, 2)         -> 1   (insert at the head, before 2)
 *   between(5, undefined)         -> 6   (insert at the tail, after 5)
 *   between(1, 2)                 -> 1.5 (insert between 1 and 2)
 *
 * If the gap between `before` and `after` becomes too small (floating point
 * starts losing precision), callers should detect that and trigger a
 * background "rebalance" pass that renumbers the column with integers
 * spaced by `DEFAULT_STEP`. We expose `MIN_GAP` so callers can check.
 */
export const DEFAULT_STEP = 1
export const MIN_GAP = 1e-6

export class FractionalIndex {
  static between(before: number | undefined, after: number | undefined): number {
    if (before === undefined && after === undefined) {
      return DEFAULT_STEP
    }
    if (before === undefined) {
      return (after as number) - DEFAULT_STEP
    }
    if (after === undefined) {
      return before + DEFAULT_STEP
    }
    if (after - before < MIN_GAP) {
      throw new Error(
        `Cannot insert between ${before} and ${after}: gap too small, rebalance required`,
      )
    }
    return (before + after) / 2
  }

  static needsRebalance(before: number, after: number): boolean {
    return after - before < MIN_GAP
  }
}
