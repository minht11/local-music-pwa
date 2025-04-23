import { describe, expect, it } from 'vitest'
import { getLibraryValue } from '../value.ts'

describe('get value', () => {
	it('should return the value', () => {
        expect(getLibraryValue('albums', 1)).resolves.toEqual(1)
		// Test implementation here
	})
})
