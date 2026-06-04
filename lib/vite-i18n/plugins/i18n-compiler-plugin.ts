import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import type { Plugin, ResolvedConfig } from 'vite'
import {
	LOCALE_MODULE_ID,
	MESSAGES_MODULE_ID,
	RUNTIME_MODULE_ID,
	VIRTUAL_RUNTIME_MODULE_ID,
} from '../constants.ts'
import {
	generateRuntimeModule,
	generateRuntimeModuleDeclaration,
} from '../generate-runtime-module.ts'
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
// (_app is kit.appDir's default — make this an option if you customize appDir.)
const CHUNK_DIR = '_app/immutable/chunks'

/** @public */
export const i18nCompilerPlugin = (
	options: I18nPluginOptions,
	loaderScriptRef: LoaderScriptRef,
): Plugin => {
	const { inputDir, outputDir, locales, baseLocale } = options

	const compiler = new MessageCompiler({ inputDir, outputDir, baseLocale })

	let absInputDir = inputDir
	let absOutputDir = outputDir
	let resolvedConfig!: ResolvedConfig
	const buildEmittedLocaleFilesMap = new Map<string, string>()
	// locale -> compiled JS, served from memory by resolveId/load (never written to disk)
	const compiledContentMap = new Map<string, string>()

	const localeModuleId = (locale: string) => `${LOCALE_MODULE_ID}?locale=${locale}`

	const localeFromId = (id: string): string | null =>
		new URLSearchParams(id.slice(LOCALE_MODULE_ID.length)).get('locale')

	// Deterministic filename — identical in client and server builds
	const computeStableFileName = (locale: string, content: string) => {
		const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)

		return `${CHUNK_DIR}/i18n-${locale}.${hash}.js`
	}

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
			resolvedConfig = config
			absInputDir = path.resolve(config.root, inputDir)
			absOutputDir = path.resolve(config.root, outputDir)
		},
		resolveId: {
			filter: {
				id: {
					include: [
						new RegExp(`^${RUNTIME_MODULE_ID}$`),
						new RegExp(`^${MESSAGES_MODULE_ID}$`),
						new RegExp(`^${LOCALE_MODULE_ID}`),
					],
				},
			},
			handler(id, _importer, opts) {
				if (id === RUNTIME_MODULE_ID) {
					return VIRTUAL_RUNTIME_MODULE_ID
				}

				// SSR/prerender doesn't switch locales at runtime — bundle the base locale.
				if (id === MESSAGES_MODULE_ID && opts?.ssr) {
					return localeModuleId(baseLocale)
				}

				// Claim the locale module id. Covers all three callers: the dev import-map
				// fetch, the SSR resolve above, and the build chunks emitted via `emitFile`.
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
					include: [
						new RegExp(`^${VIRTUAL_RUNTIME_MODULE_ID}$`),
						new RegExp(`^${LOCALE_MODULE_ID}`),
					],
				},
			},
			async handler(id) {
				if (id === VIRTUAL_RUNTIME_MODULE_ID) {
					const { scriptContent } = await getLoaderScript(this.environment.mode === 'dev')

					return generateRuntimeModule({
						baseLocale,
						locales,
						importMapLoaderScript: scriptContent,
						localStorageKey: options.localStorageKey,
					})
				}

				const locale = localeFromId(id)
				invariant(
					locale && compiledContentMap.has(locale),
					`No compiled messages for locale id "${id}"`,
				)

				return compiledContentMap.get(locale)
			},
		},
		async buildStart() {
			await fs.mkdir(absOutputDir, { recursive: true })
			const isSsr = !!resolvedConfig.build.ssr

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

			const runtimeDeclaration = generateRuntimeModuleDeclaration(baseLocale, locales)
			await fs.writeFile(path.join(absOutputDir, 'runtime.d.ts'), runtimeDeclaration)
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
