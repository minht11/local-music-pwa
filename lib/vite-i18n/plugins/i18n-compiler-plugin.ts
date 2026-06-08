import * as path from 'node:path'
import { exactRegex, prefixRegex } from '@rolldown/pluginutils'
import invariant from 'tiny-invariant'
import type { Plugin } from 'vite'
import { LOCALE_MODULE_ID, MESSAGES_MODULE_ID } from '../constants.ts'
import { localeFromId, localeModuleId } from '../locale-modules.ts'
import type { MessageCompiler } from '../message-compiler.ts'
import { emitRuntimeModule } from '../runtime.ts'

/** @public */
export interface I18nCompilerContext {
	inputDir: string
	outputDir: string
	localStorageKey: string
	baseLocale: string
	locales: string[]
	compiler: MessageCompiler
}

/** @public */
export const i18nCompilerPlugin = (ctx: I18nCompilerContext): Plugin => {
	const { inputDir, baseLocale, locales, compiler } = ctx

	let absInputDir = inputDir

	return {
		name: 'vite-plugin-i18n',
		enforce: 'pre',
		configResolved(config) {
			absInputDir = path.resolve(config.root, inputDir)
		},
		async buildStart() {
			const isClient = this.environment.config.consumer === 'client'

			await emitRuntimeModule({
				baseLocale,
				locales,
				localStorageKey: ctx.localStorageKey,
				outputDir: ctx.outputDir,
			})

			await compiler.emitTypes()

			for (const locale of locales) {
				this.addWatchFile(path.resolve(absInputDir, `${locale}.json`))

				if (isClient && this.environment.mode !== 'dev') {
					this.emitFile({
						type: 'chunk',
						id: localeModuleId(locale),
						fileName: compiler.getFileName(locale),
					})
				}
			}
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
				if (
					(id === MESSAGES_MODULE_ID && isSSR) ||
					this.environment.config.mode === 'test'
				) {
					return localeModuleId(baseLocale)
				}

				if (id.startsWith(LOCALE_MODULE_ID)) {
					const locale = localeFromId(id)

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
				const content = compiler.getContent(locale)
				invariant(content, `No compiled messages for locale id "${id}"`)

				return content
			},
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

			await compiler.generate(locale, true)
			if (locale === baseLocale) {
				await compiler.emitTypes()
			}

			const mod = this.environment.moduleGraph.getModuleById(localeModuleId(locale))
			if (mod) {
				this.environment.moduleGraph.invalidateModule(mod)
				this.environment.hot.send({ type: 'full-reload' })
			}
		},
	}
}
