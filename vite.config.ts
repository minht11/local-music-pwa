import { paraglide } from '@inlang/paraglide-vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import { themeColorsPlugin } from './lib/vite-plugin-theme-colors.ts'
import { workerChunkPlugin } from './lib/vite-plugin-worker-chunk.ts'

const a = import.meta.dirname
console.log(a)

export default defineConfig({
	server: {
		fs: {
			allow: ['./.generated'],
		},
		warmup: {
			clientFiles: [
				'src/lib/components/**/*.svelte',
				'src/lib/library/import-tracks/importer.ts',
			],
		},
	},
	worker: {
		format: 'es',
	},
	build: {
		modulePreload: {
			polyfill: false,
		},
		rollupOptions: {
			treeshake: {
				preset: 'smallest',
			},
			// Reduce bundle size a bit by tweaking rollup options
			output: {
				// Some chunks will still be smaller than this
				// because of how svelte kit works.
				experimentalMinChunkSize: 20 * 1024, // 20kb
				externalLiveBindings: false,
				freeze: false,
				compact: true,
				generatedCode: {
					preset: 'es2015',
					symbols: false,
				},
				manualChunks: (id) => {
					// Merge all css into a single file
					if (id.includes('type=style&lang.css') || id.endsWith('.css')) {
						return 'app.css'
					}

					return null
				},
			},
		},
		target: 'esnext',
		minify: 'terser',
		terserOptions: {
			output: {
				comments: false,
			},
			module: true,
			compress: {
				passes: 3,
				unsafe_math: true,
				unsafe_methods: true,
				unsafe_arrows: true,
			},
		},
	},
	plugins: [
		workerChunkPlugin(),
		themeColorsPlugin({
			output: `${import.meta.dirname}/.generated/theme-colors.css`,
		}),
		tailwindcss(),
		sveltekit(),
		AutoImport({
			dts: './.generated/types/auto-imports.d.ts',
			imports: [
				{
					from: 'svelte',
					imports: ['Snippet'],
					type: true,
				},
				{
					'$paraglide/messages': [['*', 'm']],
					'$lib/stores/player/store': ['usePlayer'],
					'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
				},
			],
		}),
		paraglide({
			project: './project.inlang',
			outdir: './.generated/paraglide',
		}),
	],
})
