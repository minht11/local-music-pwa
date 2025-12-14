/** @import { Config } from '@sveltejs/kit' */
import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {Config} */
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true,
		experimental: {
			async: true,
		},
	},
	kit: {
		paths: {
			relative: false,
		},
		outDir: './.generated/svelte-kit',
		adapter: adapter({
			// When changing this, also update env variable
			fallback: '200.html',
		}),
		alias: {
			$paraglide: './.generated/paraglide',
		},
		csp: {
			directives: {
				'default-src': ['none'],
				'script-src': ['self', 'https://gc.zgo.at/'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'blob:', 'https://snaeplayer.goatcounter.com/count'],
				'media-src': ['self', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self', 'https://snaeplayer.goatcounter.com'],
				'form-action': ['none'],
				'manifest-src': ['self'],
				'base-uri': ['none'],
			},
		},
		typescript: {
			config: (tsConfig) => {
				tsConfig.extends = '../../tsconfig.base.json'
				tsConfig.include.push('../paraglide/**/*')

				return tsConfig
			},
		},
		serviceWorker: {
			register: false,
		},
	},
}

export default config
