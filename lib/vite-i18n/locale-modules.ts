import { createHash } from 'node:crypto'
import invariant from 'tiny-invariant'
import { LOCALE_MODULE_ID } from './constants.ts'

// SvelteKit serves everything under _app/immutable/ with immutable cache headers.
const CHUNK_DIR = '_app/immutable/chunks'

/**
 * The locale is part of the pathname rather than the query string so Vite can
 * add its HMR cache-busting query without changing the import-map specifier.
 */
export const localeModuleId = (locale: string) =>
	`${LOCALE_MODULE_ID}/${encodeURIComponent(locale)}`

export const localeFromId = (id: string): string => {
	const prefix = `${LOCALE_MODULE_ID}/`
	const queryIndex = id.indexOf('?')
	const pathname = queryIndex === -1 ? id : id.slice(0, queryIndex)
	const locale = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : ''
	invariant(locale, `Failed to extract locale from module id "${id}"`)

	return decodeURIComponent(locale)
}

export const computeStableFileName = (locale: string, content: string) => {
	const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)

	return `${CHUNK_DIR}/i18n-${locale}.${hash}.js`
}
