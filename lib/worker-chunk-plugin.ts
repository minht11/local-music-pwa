import type { Plugin } from 'vite'

// https://github.com/vitejs/vite/issues/16719#issuecomment-2308170706
export const workerChunkPlugin = (): Plugin => {
	return {
		name: workerChunkPlugin.name,
		apply: 'build',
		enforce: 'pre',
		async resolveId(source, importer, _options) {
			// intercept "xxx?worker"
			if (source?.endsWith('?worker')) {
				// biome-ignore lint/style/noNonNullAssertion: we are sure that ? exists here.
				const resolved = await this.resolve(source.split('?')[0]!, importer)

				return `\0${resolved?.id}?worker-chunk`
			}

			return undefined
		},
		load(id) {
			if (id.startsWith('\0') && id.endsWith('?worker-chunk')) {
				const referenceId = this.emitFile({
					type: 'chunk',
					// biome-ignore lint/style/noNonNullAssertion: we are sure that ? exists here.
					id: id.slice(1).split('?')[0]!,
				})

				return `
					export default function WorkerWrapper() {
						return new Worker(
							import.meta.ROLLUP_FILE_URL_${referenceId},
							{ type: "module" }
						);
					}
				`
			}

			return undefined
		},
	}
}
