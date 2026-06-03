import { createHash } from 'node:crypto'
import invariant from 'tiny-invariant'
import { build } from 'vite'

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
	const result = await build({
		root: import.meta.dirname,
		build: {
			write: false,
			rollupOptions: {
				input: './script.ts',
				output: {
					entryFileNames: 'script.js',
				},
			},
		},
		define: {
			BASE_LOCALE: JSON.stringify(options.baseLocale),
			LOCALES: JSON.stringify(options.locales),
			LOCALES_MAP: JSON.stringify(options.localesMap),
			LOCAL_STORAGE_KEY: JSON.stringify(options.localStorageKey),
		},
	})

	invariant('output' in result, 'Expected output property in the build result')

	const code = result.output[0].code
	invariant(typeof code === 'string', 'Expected code to be a string')

	const cspHash = `'sha256-${createHash('sha256').update(code).digest('base64')}'`

	return {
		scriptContent: code,
		cspHash,
	}
}
