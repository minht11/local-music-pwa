import type { Plugin } from 'vite'
import { MESSAGES_MODULE_ID } from './constants.ts'
import type { LoaderScriptRef } from './import-map-loader/generate-script.ts'
import { cspHashPlugin } from './plugins/csp-hash-plugin.ts'
import { type I18nPluginOptions, i18nCompilerPlugin } from './plugins/i18n-compiler-plugin.ts'
import { ignoreStaticImportsPlugin } from './plugins/ignore-static-imports-plugin.ts'

/** @public */
export const i18nPlugin = (options: I18nPluginOptions): Plugin[] => {
	const { locales, baseLocale } = options

	if (!locales.includes(baseLocale)) {
		throw new Error(`Base locale "${baseLocale}" must be included in locales.`)
	}

	// The compiler plugin produces the loader script; the CSP plugin injects its hash.
	const loaderScriptRef: LoaderScriptRef = { current: null }

	return [
		i18nCompilerPlugin(options, loaderScriptRef),
		cspHashPlugin(loaderScriptRef),
		ignoreStaticImportsPlugin(MESSAGES_MODULE_ID),
	]
}
