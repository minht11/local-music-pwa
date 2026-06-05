import fs from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import type { Plugin } from 'vite'
import { MESSAGES_MODULE_ID } from './constants.ts'
import { generateRuntimeModule } from './generate-runtime-module.ts'
import {
	generateImportMapLoaderScript,
	type ImportMapLoaderScriptResult,
} from './import-map-loader/generate-script.ts'
import { computeStableFileName, localeModuleId } from './locale-modules.ts'
import { MessageCompiler } from './message-compiler.ts'
import { i18nCompilerPlugin } from './plugins/i18n-compiler-plugin.ts'
import { ignoreStaticImportsPlugin } from './plugins/ignore-static-imports-plugin.ts'

/** @public */
export interface CreateI18nOptions {
	inputDir: string
	outputDir: string
	baseLocale: string
	locales: string[]
	localStorageKey: string
	/** Dev server uses virtual locale module ids; builds reference hashed chunk paths. */
	isDev: boolean
}

/** @public */
export interface I18nInstance {
	/** Vite plugins that compile and serve the locale modules. Spread into `plugins`. */
	vitePlugin: Plugin[]
	/**
	 * The inline bootstrap script and its CSP hash. The consumer injects the script
	 * into the document and adds the hash to its `script-src` directive.
	 */
	importMapLoader: ImportMapLoaderScriptResult
}

/**
 * Compiles the message catalogs up front and returns the Vite plugins plus the
 * import-map loader script + CSP hash. Filenames are content-hashed, so they are
 * stable and knowable here, before the build runs.
 * @public
 */
export const createI18n = async (options: CreateI18nOptions): Promise<I18nInstance> => {
	const { inputDir, outputDir, baseLocale, locales, localStorageKey, isDev } = options

	if (!locales.includes(baseLocale)) {
		throw new Error(`Base locale "${baseLocale}" must be included in locales.`)
	}

	await fs.mkdir(outputDir, { recursive: true })

	const compiler = new MessageCompiler({ inputDir, outputDir, baseLocale })

	const compiledContentMap = new Map<string, string>()
	const emittedFileNames = new Map<string, string>()

	for (const locale of locales) {
		const { content } = await compiler.emit(locale)
		compiledContentMap.set(locale, content)
		emittedFileNames.set(locale, computeStableFileName(locale, content))
	}

	const localesMap = Object.fromEntries(
		locales.map((locale) => {
			const fileName = emittedFileNames.get(locale)
			invariant(fileName, `Missing emitted file name for locale "${locale}"`)

			return [locale, isDev ? localeModuleId(locale) : `/${fileName}`]
		}),
	)

	const importMapLoader = await generateImportMapLoaderScript({
		baseLocale,
		locales,
		localesMap,
		localStorageKey,
	})

	await fs.writeFile(
		path.join(outputDir, 'runtime.ts'),
		generateRuntimeModule({ baseLocale, locales, localStorageKey }),
	)

	const vitePlugin: Plugin[] = [
		i18nCompilerPlugin({
			inputDir,
			baseLocale,
			locales,
			compiler,
			compiledContentMap,
			emittedFileNames,
		}),
		ignoreStaticImportsPlugin(MESSAGES_MODULE_ID),
	]

	return { vitePlugin, importMapLoader }
}
