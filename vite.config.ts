import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig } from 'vite'
import { themeColorsPlugin } from './lib/vite-plugin-theme-colors.ts'
import { workerChunkPlugin } from './lib/vite-plugin-worker-chunk.ts'

export default defineConfig({
	server: {
		fs: {
			allow: ['./.generated'],
		},
		warmup: {
			clientFiles: [
				'src/lib/components/**/*.svelte',
				'src/lib/library/tracks-scanner/worker/worker.ts',
			],
		},
	},
	// Tell Vitest to use the `browser` entry points in `package.json` files, even though it's running in Node
	resolve: process.env.VITEST
		? { conditions: ['browser'] }
		: undefined,
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
					'$paraglide/messages': [['*', 'm']],
					'$lib/stores/player/use-store.ts': ['usePlayer'],
					'$lib/stores/main/use-store.ts': ['useMainStore'],
					'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
					'tiny-invariant': [['default', 'invariant']],
				},
			],
		}),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './.generated/paraglide',
			strategy: ['baseLocale'],
		}),
		{
			name: 'log-chunks-size',
			apply: 'build',
			enforce: 'post',
			writeBundle() {
				const dirSize = async (directory: string) => {
					const files = readdirSync(directory)
					const stats = files.map((file) => statSync(path.join(directory, file)))

					let size = 0
					for await (const stat of stats) {
						size += stat.size
					}

					return size
				}

				setTimeout(async () => {
					const size = await dirSize('./build/_app/immutable/chunks')
					console.log('Size of chunks:', size / 1024, 'KB')
				}, 1000)
			},
		},
	],
}) as unknown
