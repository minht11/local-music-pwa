import adapter from '@sveltejs/adapter-static'
import { vitePreprocess } from '@sveltejs/kit/vite'

/** @type {typeof import('@sveltejs/kit').Config }*/
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			fallback: 'index.html',
		}),
		prerender: {
			entries: [],
		},
	},
}

export default config
