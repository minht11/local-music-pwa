import { type StringOrUnknownItem, UNKNOWN_ITEM } from '$lib/library/types.ts'

export const truncate = (text: string, length: number): string => {
	if (text.length <= length) {
		return text
	}

	return `${text.slice(0, length)}...`
}

export const formatArtists = (artists?: readonly StringOrUnknownItem[]): string => {
	if (!artists) return ''
	return artists.filter((artist) => artist !== UNKNOWN_ITEM).join(', ')
}

export const formatNameOrUnknown = (name: StringOrUnknownItem, fallback = m.unknown()): string => {
	return name === UNKNOWN_ITEM ? fallback : name
}
