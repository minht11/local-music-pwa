import adapter from '@sveltejs/adapter-static'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { defineConfig, loadEnv, type UserConfig } from 'vite'
import { createI18n } from './lib/vite-i18n/create-i18n.ts'
import { imageMetadataPlugin } from './lib/vite-image-metadata.ts'
import { logChunkSizePlugin } from './lib/vite-log-chunk-size.ts'

const env = loadEnv('production', process.cwd(), 'PUBLIC_')

const goatCounterUrl = env.PUBLIC_GOAT_COUNTER_URL as `https://${string}.${string}` | undefined

type FalsyValue = false | 0 | '' | null | undefined
const filterFalsy = <const T>(arr: T[]) => arr.filter((x) => x) as Exclude<T, FalsyValue>[]

const CSS_FILE_RE = /\.css$/

const getAutoImportPlugin = (dts: string | false = false) =>
	AutoImport({
		dts,
		imports: [
			{
				'i18n:messages': [['*', 'm']],
				'$lib/stores/player/use-store.ts': ['usePlayer'],
				'$lib/stores/main/use-store.ts': ['useMainStore'],
				'$lib/stores/dialogs/use-store.ts': ['useDialogsStore'],
				'$lib/components/menu/MenuRenderer.svelte': ['useMenu'],
				'$lib/components/snackbar/snackbar.ts': ['snackbar'],
				'tiny-invariant': [['default', 'invariant']],
				svelte: ['untrack'],
			},
		],
	})

export default defineConfig(async ({ command, isPreview }): Promise<UserConfig> => {
	const i18n = await createI18n({
		inputDir: 'messages',
		outputDir: './.generated/i18n',
		baseLocale: 'en',
		locales: ['en', 'lt', 'de', 'fr', 'es', 'hi', 'ja', 'zh-CN', 'zh-TW'],
		localStorageKey: 'snae-locale',
		isDev: command === 'serve' && !isPreview,
	})

	return {
		server: {
			fs: {
				allow: ['./.generated'],
			},
			warmup: {
				// Avoids page reloading in Dev mode. When vite supports bundled-dev mode this can be removed.
				clientFiles: [
					'src/lib/components/**/*.svelte',
					'src/lib/library/scan-actions/scanner/worker.ts',
				],
			},
		},
		// Tell Vitest to use the `browser` entry points in `package.json` files, even though it's running in Node
		resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
		define: {
			__IMPORT_MAP_LOADER_SCRIPT__: JSON.stringify(i18n.importMapLoader.scriptContent),
		},
		build: {
			target: ['chrome130', 'safari18'],
			rolldownOptions: {
				output: {
					comments: false,
					advancedChunks: {
						groups: [
							{
								// Merge all css into a single file
								name: 'styles',
								test: CSS_FILE_RE,
								minModuleSize: 0,
								priority: 100,
							},
							{
								// Merge smaller chunks together
								name: 'small-chunks',
								maxModuleSize: 2 * 1024,
							},
						],
					},
				},
			},
		},
		worker: {
			format: 'es',
			plugins: () => [getAutoImportPlugin()],
		},
		plugins: [
			i18n.vitePlugin,
			imageMetadataPlugin(),
			tailwindcss(),
			sveltekit({
				compilerOptions: {
					runes: true,
					experimental: {
						async: true,
					},
				},
				// TODO. Reenable this once https://github.com/sveltejs/kit/issues/15985 is fixed.
				// experimental: {
				// 	explicitEnvironmentVariables: true,
				// },
				paths: {
					relative: false,
				},
				alias: {
					'i18n:runtime': '.generated/i18n/runtime.ts',
				},
				outDir: './.generated/svelte-kit',
				adapter: adapter({
					fallback: env.PUBLIC_FALLBACK_PAGE,
				}),
				prerender: {
					origin: 'https://snaeplayer.com',
				},
				csp: {
					mode: 'hash',
					directives: {
						'default-src': ['none'],
						'script-src': ['self', ...i18n.importMapLoader.cspHashes],
						'style-src': ['self', 'unsafe-inline'],
						'img-src': filterFalsy([
							'self',
							'blob:',
							goatCounterUrl && `${goatCounterUrl}/count`,
						]),
						'media-src': ['self', 'blob:'],
						'font-src': ['self'],
						'connect-src': filterFalsy(['self', goatCounterUrl]),
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
			}),
			getAutoImportPlugin('./.generated/types/auto-imports.d.ts'),
			logChunkSizePlugin(),
		],
	}
})
