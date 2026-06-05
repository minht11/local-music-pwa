import * as path from 'node:path'
import { exactRegex, prefixRegex } from '@rolldown/pluginutils'
import invariant from 'tiny-invariant'
import type { Plugin } from 'vite'
import { LOCALE_MODULE_ID, MESSAGES_MODULE_ID } from '../constants.ts'
import { localeFromId, localeModuleId } from '../locale-modules.ts'
import type { MessageCompiler } from '../message-compiler.ts'

/** @public */
export interface I18nCompilerContext {
	inputDir: string
	baseLocale: string
	locales: string[]
	compiler: MessageCompiler
	/** Compiled message module per locale. Mutated in place on dev recompiles. */
	compiledContentMap: Map<string, string>
	/** Stable, content-hashed chunk file name per locale (build only). */
	emittedFileNames: Map<string, string>
}

/** @public */
export const i18nCompilerPlugin = (ctx: I18nCompilerContext): Plugin => {
	const { inputDir, baseLocale, locales, compiler, compiledContentMap, emittedFileNames } = ctx

	let absInputDir = inputDir

	return {
		name: 'vite-plugin-i18n',
		enforce: 'pre',
		configResolved(config) {
			absInputDir = path.resolve(config.root, inputDir)
		},
		resolveId: {
			filter: {
				id: {
					include: [exactRegex(MESSAGES_MODULE_ID), prefixRegex(LOCALE_MODULE_ID)],
				},
			},
			handler(id) {
				const isSSR = this.environment.config.consumer === 'server'

				// SSR/prerender doesn't switch locales at runtime
				if (id === MESSAGES_MODULE_ID && isSSR) {
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
					include: prefixRegex(LOCALE_MODULE_ID),
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
		buildStart() {
			const isClient = this.environment.config.consumer === 'client'

			for (const locale of locales) {
				this.addWatchFile(path.resolve(absInputDir, `${locale}.json`))

				if (isClient && this.environment.mode !== 'dev') {
					const fileName = emittedFileNames.get(locale)
					invariant(fileName, `Missing emitted file name for locale "${locale}"`)

					this.emitFile({
						type: 'chunk',
						id: localeModuleId(locale),
						fileName,
					})
				}
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
