import { describe, expect, it } from 'vitest'
import { foldForSearch } from '../utils/text.ts'

describe('foldForSearch', () => {
	it('lowercases text', () => {
		expect(foldForSearch('BEYONCÉ')).toBe('beyonce')
	})

	it('strips diacritics so plain input matches accented metadata', () => {
		expect(foldForSearch('Beyoncé')).toContain('beyonce')
		expect(foldForSearch('Björk')).toBe('bjork')
		expect(foldForSearch('Mötley Crüe')).toBe('motley crue')
		expect(foldForSearch('Sigur Rós')).toBe('sigur ros')
	})

	it('keeps non-latin scripts intact', () => {
		expect(foldForSearch('東京事変')).toBe('東京事変')
		expect(foldForSearch('ДДТ')).toBe('ддт')
	})
})
