import { type StringOrUnknownItem, UNKNOWN_ITEM } from '$lib/library/types.ts'

export const truncate = (text: string, length: number): string => {
	if (text.length <= length) {
		return text
	}

	return `${text.slice(0, length)}...`
}

export const formatArtists = (artists: readonly StringOrUnknownItem[]): string => {
	return artists.filter((artist) => artist !== UNKNOWN_ITEM).join(', ')
}

export const formatNameOrUnknown = (name: StringOrUnknownItem, fallback = m.unknown()): string => {
	return name === UNKNOWN_ITEM ? fallback : name
}

export const getItemLanguage = (language: string | undefined): string | undefined => {
	if (!language) {
		return
	}

	const lang = language.toLowerCase()
	switch (lang) {
		case 'jp':
		case 'jap':
		case 'japanese':
			return 'ja'
		case 'korean':
			return 'ko'
		case 'zho':
		case 'chinese':
			return 'zh'
		case 'cantonese':
			return 'yue'
		case 'fre':
		case 'french':
			return 'fr'
		case 'esp':
		case 'spanish':
			return 'es'
		case 'eng':
		case 'english':
			return 'en'
		default:
			return lang
	}
}
