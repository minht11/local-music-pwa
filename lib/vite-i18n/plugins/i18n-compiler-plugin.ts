import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import * as path from 'node:path'
import invariant from 'tiny-invariant'
import type { Plugin, ResolvedConfig } from 'vite'
import {
	DEV_LOCALE_MODULE_ID,
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
	type ImportMapLoaderScriptResult,
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

const SCRIPT_SRC_RE = /(script-src\s[^;'"]*)/

// SvelteKit serves everything under _app/immutable/ with immutable cache headers.
// (_app is kit.appDir's default — make this an option if you customize appDir.)
const CHUNK_DIR = '_app/immutable/chunks'

/** @public */
export const i18nCompilerPlugin = (options: I18nPluginOptions): Plugin => {
	const { inputDir, outputDir, locales, baseLocale } = options

	const compiler = new MessageCompiler({ inputDir, outputDir, baseLocale })

	let absInputDir = inputDir
	let absOutputDir = outputDir
	let resolvedConfig!: ResolvedConfig
	const buildEmittedLocaleFilesMap = new Map<string, string>()
	let isDev = false

	const resolveOutputtedLocalePath = (locale: string) =>
		path.resolve(absOutputDir, `${locale}.js`)

	// Deterministic filename — identical in client and server builds
	const computeStableFileName = (locale: string, content: string) => {
		const hash = createHash('sha256').update(content).digest('hex').slice(0, 8)

		return `${CHUNK_DIR}/i18n-${locale}.${hash}.js`
	}

	let importMapLoaderScript: ImportMapLoaderScriptResult | null = null
	const getLoaderScript = async () => {
		if (importMapLoaderScript) {
			return importMapLoaderScript
		}

		const scriptResult = await generateImportMapLoaderScript({
			baseLocale,
			locales,
			localesMap: Object.fromEntries(
				locales.map((locale) => [
					locale,
					isDev
						? `${DEV_LOCALE_MODULE_ID}?locale=${locale}`
						: `/${buildEmittedLocaleFilesMap.get(locale)}`,
				]),
			),
			localStorageKey: options.localStorageKey,
		})

		importMapLoaderScript = scriptResult
		return scriptResult
	}

	return {
		name: 'vite-plugin-i18n',
		enforce: 'pre',
		configResolved(config) {
			isDev = config.command === 'serve'
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
						new RegExp(`^${DEV_LOCALE_MODULE_ID}`),
					],
				},
			},
			handler(id, _importer, opts) {
				if (id === RUNTIME_MODULE_ID) {
					return VIRTUAL_RUNTIME_MODULE_ID
				}

				// On SSR we return base locale, app doesn't care about i18n during prerendering
				if (id === MESSAGES_MODULE_ID && opts?.ssr) {
					return resolveOutputtedLocalePath(baseLocale)
				}

				if (id.startsWith(DEV_LOCALE_MODULE_ID)) {
					const locale = new URLSearchParams(id.slice(DEV_LOCALE_MODULE_ID.length)).get(
						'locale',
					)
					invariant(locale, 'Missing locale query param in dev locale import')

					if (locales.includes(locale)) {
						return resolveOutputtedLocalePath(locale)
					}
				}

				return undefined
			},
		},
		load: {
			filter: { id: { include: [new RegExp(`^${VIRTUAL_RUNTIME_MODULE_ID}$`)] } },
			async handler(_id) {
				const { scriptContent } = await getLoaderScript()

				if (isDev) {
					return generateRuntimeModule({
						baseLocale,
						locales,
						importMapLoaderScript: scriptContent,
						localStorageKey: options.localStorageKey,
					})
				}

				return generateRuntimeModule({
					baseLocale,
					locales,
					importMapLoaderScript: scriptContent,
					localStorageKey: options.localStorageKey,
				})
			},
		},
		async buildStart() {
			await fs.mkdir(absOutputDir, { recursive: true })
			const isSsr = !!resolvedConfig.build.ssr

			for (const locale of locales) {
				const compiledResult = await compiler.emit(locale)
				this.addWatchFile(compiledResult.inputFilePath)

				const stableFileName = await computeStableFileName(locale, compiledResult.content)
				buildEmittedLocaleFilesMap.set(locale, stableFileName)

				if (!(isSsr || isDev)) {
					this.emitFile({
						type: 'chunk',
						id: compiledResult.outputFilePath,
						fileName: stableFileName,
					})
				}
			}

			const runtimeDeclaration = generateRuntimeModuleDeclaration(baseLocale, locales)
			await fs.writeFile(path.join(absOutputDir, 'runtime.d.ts'), runtimeDeclaration)
		},
		async watchChange(id) {
			if (!(id.startsWith(absInputDir) && id.endsWith('.json'))) {
				return
			}

			const locale = path.basename(id, '.json')
			await compiler.emit(locale, true)
		},
		generateBundle(_outputOptions, bundle) {
			if (resolvedConfig.build.ssr || isDev) {
				return
			}

			const script = importMapLoaderScript
			if (!script) {
				return
			}

			const { cspHash } = script

			for (const asset of Object.values(bundle)) {
				if (asset.type !== 'asset' || !asset.fileName.endsWith('.html')) {
					continue
				}

				if (typeof asset.source !== 'string') {
					continue
				}

				asset.source = asset.source.replace(SCRIPT_SRC_RE, `$1 ${cspHash}`)
			}
		},
	}
}
