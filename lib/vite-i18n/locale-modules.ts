import { createHash } from 'node:crypto'
import invariant from 'tiny-invariant'
import { LOCALE_MODULE_ID } from './constants.ts'

// SvelteKit serves everything under _app/immutable/ with immutable cache headers.
const CHUNK_DIR = '_app/immutable/chunks'

export const localeModuleId = (locale: string) => `${LOCALE_MODULE_ID}?locale=${locale}`

export const localeFromId = (id: string): string => {
	const locale = new URLSearchParams(id.slice(LOCALE_MODULE_ID.length)).get('locale')
	invariant(locale, `Failed to extract locale from module id "${id}"`)

	return locale
}

export const computeStableFileName = (locale: string, content: string) => {
	const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)

	return `${CHUNK_DIR}/i18n-${locale}.${hash}.js`
}
