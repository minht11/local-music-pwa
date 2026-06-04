import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import type { Plugin } from 'vite'
import { LOCALE_MODULE_ID, MESSAGES_MODULE_ID } from '../constants.ts'
import { generateRuntimeModule } from '../generate-runtime-module.ts'
import {
	generateImportMapLoaderScript,
	type LoaderScriptRef,
} from '../import-map-loader/generate-script.ts'
import { MessageCompiler } from '../message-compiler.ts'

/** @public */
export interface I18nPluginOptions {
	inputDir: string
	outputDir: string
	baseLocale: string
	locales: string[]
	localStorageKey: string
}

// SvelteKit serves everything under _app/immutable/ with immutable cache headers.
const CHUNK_DIR = '_app/immutable/chunks'

const localeModuleId = (locale: string) => `${LOCALE_MODULE_ID}?locale=${locale}`

const localeFromId = (id: string): string | null =>
	new URLSearchParams(id.slice(LOCALE_MODULE_ID.length)).get('locale')

const computeStableFileName = (locale: string, content: string) => {
	const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)

	return `${CHUNK_DIR}/i18n-${locale}.${hash}.js`
}

/** @public */
export const i18nCompilerPlugin = (
	options: I18nPluginOptions,
	loaderScriptRef: LoaderScriptRef,
): Plugin => {
	const { inputDir, outputDir, locales, baseLocale } = options

	const compiler = new MessageCompiler({ inputDir, outputDir, baseLocale })

	let absInputDir = inputDir
	const buildEmittedLocaleFilesMap = new Map<string, string>()

	const compiledContentMap = new Map<string, string>()

	// Populated once and shared with the CSP plugin, which reads its `cspHash`.
	const getLoaderScript = async (isDev: boolean) => {
		if (loaderScriptRef.current) {
			return loaderScriptRef.current
		}

		const scriptResult = await generateImportMapLoaderScript({
			baseLocale,
			locales,
			localesMap: Object.fromEntries(
				locales.map((locale) => [
					locale,
					isDev ? localeModuleId(locale) : `/${buildEmittedLocaleFilesMap.get(locale)}`,
				]),
			),
			localStorageKey: options.localStorageKey,
		})

		loaderScriptRef.current = scriptResult
		return scriptResult
	}

	return {
		name: 'vite-plugin-i18n',
		enforce: 'pre',
		configResolved(config) {
			absInputDir = path.resolve(config.root, inputDir)
		},
		resolveId: {
			filter: {
				id: {
					include: [
						new RegExp(`^${MESSAGES_MODULE_ID}$`),
						new RegExp(`^${LOCALE_MODULE_ID}`),
					],
				},
			},
			handler(id, _importer, opts) {
				// SSR/prerender doesn't switch locales at runtime
				if (id === MESSAGES_MODULE_ID && opts?.ssr) {
					return localeModuleId(baseLocale)
				}

				if (id.startsWith(LOCALE_MODULE_ID)) {
					const locale = localeFromId(id)
					invariant(locale, 'Missing locale query param in locale module id')

					if (locales.includes(locale)) {
						return id
					}
				}

				return undefined
			},
		},
		load: {
			filter: {
				id: {
					include: [new RegExp(`^${LOCALE_MODULE_ID}`)],
				},
			},
			handler(id) {
				const locale = localeFromId(id)
				invariant(
					locale && compiledContentMap.has(locale),
					`No compiled messages for locale id "${id}"`,
				)

				return compiledContentMap.get(locale)
			},
		},
		async buildStart() {
			await fs.mkdir(outputDir, { recursive: true })

			const isSsr = !!this.environment.config.build.ssr

			for (const locale of locales) {
				const { inputFilePath, content } = await compiler.emit(locale)
				this.addWatchFile(inputFilePath)
				compiledContentMap.set(locale, content)

				const stableFileName = computeStableFileName(locale, content)
				buildEmittedLocaleFilesMap.set(locale, stableFileName)

				if (!(isSsr || this.environment.mode === 'dev')) {
					this.emitFile({
						type: 'chunk',
						id: localeModuleId(locale),
						fileName: stableFileName,
					})
				}
			}

			const { scriptContent } = await getLoaderScript(this.environment.mode === 'dev')
			if (!isSsr) {
				const runtimeModule = generateRuntimeModule({
					baseLocale,
					locales,
					importMapLoaderScript: scriptContent,
					localStorageKey: options.localStorageKey,
				})

				await fs.writeFile(path.join(outputDir, 'runtime.ts'), runtimeModule)
			}
		},
		async watchChange(id) {
			if (this.environment.mode !== 'dev') {
				return
			}

			if (!(id.startsWith(absInputDir) && id.endsWith('.json'))) {
				return
			}

			const locale = path.basename(id, '.json')
			if (!locales.includes(locale)) {
				return
			}

			const { content } = await compiler.emit(locale, true)
			compiledContentMap.set(locale, content)

			const mod = this.environment.moduleGraph.getModuleById(localeModuleId(locale))
			if (mod) {
				this.environment.moduleGraph.invalidateModule(mod)
				this.environment.hot.send({ type: 'full-reload' })
			}
		},
	}
}
