import { FractionalIndex, MIN_GAP } from './fractional-index'

describe('FractionalIndex', () => {
  describe('between', () => {
    it('returns the default step when the column is empty', () => {
      expect(FractionalIndex.between(undefined, undefined)).toBe(1)
    })

    it('inserts before the first card', () => {
      expect(FractionalIndex.between(undefined, 5)).toBe(4)
    })

    it('inserts after the last card', () => {
      expect(FractionalIndex.between(10, undefined)).toBe(11)
    })

    it('inserts in the middle of two integer positions', () => {
      expect(FractionalIndex.between(1, 2)).toBe(1.5)
    })

    it('inserts in the middle of two fractional positions', () => {
      expect(FractionalIndex.between(1.25, 1.5)).toBe(1.375)
    })

    it('handles negative positions (insert before head)', () => {
      // After inserting at head twice, positions go negative — this is normal.
      const headPosition = FractionalIndex.between(undefined, 0)
      expect(headPosition).toBe(-1)
    })

    it('throws when the gap between neighbors collapses below MIN_GAP', () => {
      const a = 1
      const b = a + MIN_GAP / 2
      expect(() => FractionalIndex.between(a, b)).toThrow(/rebalance required/)
    })
  })

  describe('needsRebalance', () => {
    it('returns false for normal gaps', () => {
      expect(FractionalIndex.needsRebalance(1, 2)).toBe(false)
    })

    it('returns true when the gap is below MIN_GAP', () => {
      expect(FractionalIndex.needsRebalance(1, 1 + MIN_GAP / 2)).toBe(true)
    })
  })
})
