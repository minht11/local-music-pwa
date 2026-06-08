import fs from 'node:fs/promises'
import type { Plugin } from 'vite'
import { MESSAGES_MODULE_ID } from './constants.ts'
import {
	generateImportMapLoaderScript,
	type ImportMapLoaderScriptResult,
} from './import-map-loader/generate-script.ts'
import { localeModuleId } from './locale-modules.ts'
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
	vitePlugin: Plugin[]
	importMapLoader: ImportMapLoaderScriptResult
}

/**
 * Compiles the message catalogs up front and returns the Vite plugins plus the
 * import-map loader script.
 * @public
 */
export const createI18n = async (options: CreateI18nOptions): Promise<I18nInstance> => {
	const { inputDir, outputDir, baseLocale, locales, localStorageKey, isDev } = options

	if (!locales.includes(baseLocale)) {
		throw new Error(`Base locale "${baseLocale}" must be included in locales.`)
	}

	await fs.mkdir(outputDir, { recursive: true })

	const compiler = new MessageCompiler({ inputDir, outputDir, baseLocale, locales })
	await compiler.prepare()

	const localesMap = Object.fromEntries(
		locales.map((locale) => [
			locale,
			isDev ? localeModuleId(locale) : `/${compiler.getFileName(locale)}`,
		]),
	)

	const importMapLoader = await generateImportMapLoaderScript({
		baseLocale,
		locales,
		localesMap,
		localStorageKey,
	})

	const vitePlugin: Plugin[] = [
		i18nCompilerPlugin({
			inputDir,
			outputDir,
			localStorageKey,
			baseLocale,
			locales,
			compiler,
		}),
		ignoreStaticImportsPlugin(MESSAGES_MODULE_ID),
	]

	return { vitePlugin, importMapLoader }
}
