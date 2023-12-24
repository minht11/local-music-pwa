import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {typeof import('@sveltejs/kit').Config }*/
const config = {
	preprocess: vitePreprocess(),
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
	},
}

export default config
