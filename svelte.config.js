import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config }*/
const config = {
	preprocess: vitePreprocess(),
	compilerOptions: {
		runes: true,
	},
	kit: {
		outDir: './.generated/svelte-kit',
		adapter: adapter({
			fallback: 'index.html',
		}),
		prerender: {
			entries: [],
		},
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
	},
}

export default config
