import { describe, expect, test } from '@jest/globals'
import FlatteningForwardIterator from './flattening_forward_iterator'

describe('flattening forward iterator', () => {
    test('works for numbers', () => {
        const a1: readonly number[] = [1, 2, 3]
        const a2: readonly number[] = [4, 5, 6, 7]
        let result = []
        for (const it of new FlatteningForwardIterator(a1, a2)) {
            result.push(it)
        }
        expect(result).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    test('handles empty', () => {
        let it = new FlatteningForwardIterator()
        expect(Array.from(it)).toEqual([])
    })

    test('handles single array', () => {
        expect(Array.from(new FlatteningForwardIterator(['one']))).toEqual([
            'one',
        ])
    })
})
