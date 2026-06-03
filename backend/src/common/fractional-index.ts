// Position helper for Kanban ordering. Inserts between two siblings without
// renumbering the whole list. If the gap collapses below MIN_GAP the caller
// should rebalance (renumber the column with integers spaced by DEFAULT_STEP).
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
