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
		// TODO. Add csp options
		// csp
	},
}

export default config
