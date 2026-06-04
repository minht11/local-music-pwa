import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import { minifySync, transformWithOxc } from 'vite'
import { MESSAGES_MODULE_ID } from '../constants.ts'

const SCRIPT_PATH = path.join(import.meta.dirname, 'script.ts')

interface GenerateImportMapLoaderScriptOptions {
	baseLocale: string
	locales: string[]
	localesMap: Record<string, string>
	localStorageKey: string
}

/** @public */
export interface ImportMapLoaderScriptResult {
	scriptContent: string
	cspHash: string
}

/**
 * Shared, lazily-populated handle to the compiled loader script. The compiler
 * plugin produces it; the CSP plugin reads its `cspHash`.
 * @public
 */
export interface LoaderScriptRef {
	current: ImportMapLoaderScriptResult | null
}

/** @public */
export const generateImportMapLoaderScript = async (
	options: GenerateImportMapLoaderScriptOptions,
): Promise<ImportMapLoaderScriptResult> => {
	const source = await readFile(SCRIPT_PATH, 'utf8')

	const transpiled = await transformWithOxc(source, SCRIPT_PATH, {
		lang: 'ts',
		define: {
			BASE_LOCALE: JSON.stringify(options.baseLocale),
			LOCALES: JSON.stringify(options.locales),
			LOCALES_MAP: JSON.stringify(options.localesMap),
			LOCAL_STORAGE_KEY: JSON.stringify(options.localStorageKey),
			MESSAGES_MODULE_ID: JSON.stringify(MESSAGES_MODULE_ID),
		},
	})

	const { code, errors } = minifySync('script.js', transpiled.code)
	invariant(
		errors.length === 0,
		`Failed to minify import map loader script: ${errors.join(', ')}`,
	)

	const cspHash = `'sha256-${createHash('sha256').update(code).digest('base64')}'`

	return {
		scriptContent: code,
		cspHash,
	}
}
