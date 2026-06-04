import adapter from '@sveltejs/adapter-static'
import type { Config } from '@sveltejs/kit'
import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), 'PUBLIC_')

const goatCounterUrl = env.PUBLIC_GOAT_COUNTER_URL as `https://${string}.${string}` | undefined

type FalsyValue = false | 0 | '' | null | undefined
const filterFalsy = <const T>(arr: T[]) => arr.filter((x) => x) as Exclude<T, FalsyValue>[]

const config: Config = {
	compilerOptions: {
		runes: true,
		experimental: {
			async: true,
		},
	},
	kit: {
		experimental: {
			explicitEnvironmentVariables: true,
		},
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
				'script-src': filterFalsy([
					'self',
					'https://gc.zgo.at/',
					// import map script hash is injected only during build, so we relax csp during dev.
					process.env.NODE_ENV === 'development' && 'unsafe-inline',
				]),
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
	},
}

export default config
