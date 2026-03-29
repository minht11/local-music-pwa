import { defaultExclude, defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'jsdom',
			exclude: [...defaultExclude, '.generated/**', 'build/**'],
			coverage: {
				include: ['src/'],
			},
		},
	}),
)
