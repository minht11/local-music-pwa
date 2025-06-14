import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/** @public */
export const logChunkSizePlugin = (): Plugin => {
	return {
		name: logChunkSizePlugin.name,
		apply: 'build',
		enforce: 'post',
		writeBundle() {
			const dirSize = async (directory: string) => {
				const files = readdirSync(directory)
				const stats = files.map((file) => statSync(path.join(directory, file)))

				let size = 0
				let count = 0
				for await (const stat of stats) {
					size += stat.size
					count += 1
				}

				return { size, count }
			}

			setTimeout(async () => {
				const { size, count } = await dirSize('./build/_app/immutable/chunks')
				console.log('Size of chunks:', size / 1024, 'KB. Files count:', count)
			}, 2000)
		},
	}
}
