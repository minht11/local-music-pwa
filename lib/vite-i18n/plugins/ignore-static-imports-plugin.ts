import type { Plugin } from 'vite'

/** @public */
export const ignoreStaticImportsPlugin = (importKey: string): Plugin => ({
	name: 'vite-plugin-i18n:ignore-dev-imports',
	enforce: 'pre',
	config(config) {
		config.optimizeDeps = {
			...(config.optimizeDeps ?? {}),
			exclude: [...(config.optimizeDeps?.exclude ?? []), importKey],
		}
	},
	configResolved(resolvedConfig) {
		const VALID_ID_PREFIX = '/@id/'
		const reg = new RegExp(`${VALID_ID_PREFIX}(${importKey})`, 'g')

		const plugins = resolvedConfig.plugins as Plugin[]

		plugins.push({
			name: 'vite-plugin-i18n:ignore-dev-imports-replace-id-prefix',
			transform: (code) => (reg.test(code) ? code.replace(reg, (_m, s1) => s1) : code),
		})
	},
	resolveId: (id) => {
		if (importKey === id) {
			return { id, external: true }
		}

		return null
	},
	// Return a stub so Vite's pre-transform warmup doesn't emit "does the file exist?" warnings.
	// The browser never loads this directly — the import map intercepts the bare specifier first.
	load: (id) => {
		if (importKey === id) {
			return ''
		}

		return null
	},
})
