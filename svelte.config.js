/** @import { Config } from '@sveltejs/kit' */
import adapter from '@sveltejs/adapter-static'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'PUBLIC_')

/** @type {Config} */
const config = {
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
		prerender: {
			origin: 'https://snaeplayer.com',
		},
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['none'],
				'script-src': [
					'self',
					'https://gc.zgo.at/',
					// import map script hash is injected only during build, so we relax csp during dev.
					process.env.NODE_ENV === 'development' ? 'unsafe-inline' : '',
				],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': [
					'self',
					'blob:',
					env.PUBLIC_GOAT_COUNTER_URL ? `${env.PUBLIC_GOAT_COUNTER_URL}/count` : '',
				],
				'media-src': ['self', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self', env.PUBLIC_GOAT_COUNTER_URL ?? ''],
				'form-action': ['none'],
				'manifest-src': ['self'],
				'base-uri': ['none'],
			},
		},
		typescript: {
			config: (tsConfig) => {
				tsConfig.extends = '../../tsconfig.base.json'

				return tsConfig
			},
		},
		serviceWorker: {
			register: false,
		},
	},
}

export default config
