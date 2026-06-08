import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import invariant from 'tiny-invariant'
import { minifySync, transformWithOxc } from 'vite'
import { MESSAGES_MODULE_ID } from '../constants.ts'

interface GenerateImportMapLoaderScriptOptions {
	baseLocale: string
	locales: string[]
	localesMap: Record<string, string>
	localStorageKey: string
}

/** @public */
export interface ImportMapLoaderScriptResult {
	scriptContent: string
	cspHashes: `sha256-${string}`[]
}

const createHashForContent = (content: string) => {
	const hash = createHash('sha256').update(content).digest('base64')

	return `sha256-${hash}` as const
}

/** @public */
export const generateImportMapLoaderScript = async (
	options: GenerateImportMapLoaderScriptOptions,
): Promise<ImportMapLoaderScriptResult> => {
	const scriptUrl = fileURLToPath(import.meta.resolve('./script.ts'))
	const source = await readFile(scriptUrl, 'utf8')

	const transpiled = await transformWithOxc(source, 'script.ts', {
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

	const loaderScriptCspHash = createHashForContent(code)

	// Must mirror exactly the import map that import-map-loader/script.ts injects at runtime.
	const importMapCspHashes = options.locales.map((locale) => {
		const importMap = JSON.stringify({
			imports: { [MESSAGES_MODULE_ID]: options.localesMap[locale] },
		})

		return createHashForContent(importMap)
	})

	return {
		scriptContent: code,
		cspHashes: [loaderScriptCspHash, ...importMapCspHashes],
	}
}
