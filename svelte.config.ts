import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

const config: Config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true,
	},
	kit: {
		outDir: './.generated/svelte-kit',
		adapter: adapter({
			fallback: '200.html',
		}),
		serviceWorker: {
			register: process.env.NODE_ENV === 'production',
		},
		alias: {
			$paraglide: './.generated/paraglide',
		},
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['none'],
				'script-src': ['self', 'unsafe-inline', 'https://gc.zgo.at/'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'blob:', 'data:', 'https:', 'https://snaeplayer.goatcounter.com/count', 'https://lh3.googleusercontent.com', 'https://yt3.ggpht.com', 'https://i.ytimg.com'],
				'media-src': ['self', 'blob:'],
				'font-src': ['self'],
				'connect-src': ['self', 'https://snaeplayer.goatcounter.com', 'http://localhost:*', 'http://127.0.0.1:*', 'ws://localhost:*', 'ws://127.0.0.1:*'],
				'form-action': ['none'],
				'manifest-src': ['self'],
				'base-uri': ['none'],
				'worker-src': ['self'],
			},
		},
		typescript: {
			config: (tsConfig) => {
				tsConfig.extends = '../../tsconfig.base.json'
				tsConfig.include.push('../paraglide/**/*')

				return tsConfig
			},
		},
	},
}

export default config
