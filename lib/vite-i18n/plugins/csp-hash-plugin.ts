import type { Plugin } from 'vite'
import type { LoaderScriptRef } from '../import-map-loader/generate-script.ts'

const SCRIPT_SRC_RE = /(script-src\s[^;'"]*)/

/**
 * Injects the import-map loader's CSP hash into the `script-src` of emitted HTML.
 *
 * The inline loader is added to the document after SvelteKit has already computed
 * its own CSP hashes, so it isn't hashed automatically. The hash is produced by the
 * i18n compiler plugin and shared here via `loaderScriptRef`.
 * @public
 */
export const cspHashPlugin = (loaderScriptRef: LoaderScriptRef): Plugin => ({
	name: 'vite-plugin-i18n:csp-hash',
	generateBundle(_outputOptions, bundle) {
		if (this.environment.mode !== 'build') {
			return
		}

		const script = loaderScriptRef.current
		if (!script) {
			throw new Error(
				'Expected loaderScriptRef.current to be populated with the import map loader script result',
			)
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
})
