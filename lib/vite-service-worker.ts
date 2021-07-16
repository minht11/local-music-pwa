// Core logic regarding service worker is from https://github.com/GoogleChromeLabs/squoosh/blob/dev/lib/sw-plugin.js
// Manifest part is heavily inspired from vite-plugin-pwa
import { PluginOption } from 'vite'
import { OutputChunk } from 'rollup'
import { createHash } from 'crypto'
import { posix } from 'path'

const importPrefix = 'service-worker:'

interface Options {
  output?: string
  // TODO: add actual types one day.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  manifest: Record<string, any>
}

export const serviceWorker = ({
  output = 'sw.js',
  manifest,
}: Options): PluginOption => {
  const fileRefs = new Set<string>()

  return {
    name: 'service-worker',
    enforce: 'post',
    async resolveId(id, importer) {
      if (!id.startsWith(importPrefix)) {
        return undefined
      }

      const plainId = id.slice(importPrefix.length)
      const result = await this.resolve(plainId, importer)
      if (!result) {
        return undefined
      }

      return importPrefix + result.id
    },
    load(id) {
      if (!id.startsWith(importPrefix)) {
        return undefined
      }
      const fileId = this.emitFile({
        type: 'chunk',
        id: id.slice(importPrefix.length),
        fileName: output,
      })
      fileRefs.add(fileId)

      return `export default import.meta.ROLLUP_FILE_URL_${fileId};`
    },
    resolveFileUrl({ referenceId, fileName }) {
      // Vite always removes import meta https://github.com/vitejs/vite/issues/3380
      // so use document.baseURI instead as a workaround
      if (fileRefs.has(referenceId)) {
        return `new URL('${fileName}', document.baseURI).href`
      }

      return undefined
    },
    generateBundle(_, bundle) {
      const swChunk = bundle[output] as OutputChunk

      const MANIFEST_FILE = 'manifest.webmanifest'
      for (const file of Object.values(bundle)) {
        if (
          file.type === 'asset' &&
          file.fileName.endsWith('html') &&
          typeof file.source === 'string'
        ) {
          const manifestLink = `<link rel="manifest" href="/${MANIFEST_FILE}">`
          file.source = file.source.replace('</head>', `${manifestLink}</head>`)
        }
      }
      bundle[MANIFEST_FILE] = {
        isAsset: true,
        type: 'asset',
        name: undefined,
        source: JSON.stringify(manifest, null, 0),
        fileName: MANIFEST_FILE,
      }

      if (!swChunk) {
        return
      }

      const toCacheInSW = Object.values(bundle).filter(
        (item) => item !== swChunk,
      )
      const urls = toCacheInSW.map((item) =>
        posix.relative(posix.dirname(output), item.fileName),
      )

      const versionHash = createHash('sha1')
      for (const item of toCacheInSW) {
        let contents
        if (item.type === 'asset') {
          contents = item.source
        } else {
          contents = item.code
        }
        versionHash.update(contents)
      }
      for (const icon of manifest.icons) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        urls.push(icon.src)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        versionHash.update(icon.src)
      }

      const version = versionHash.digest('hex')

      swChunk.code = `
        const ASSETS = ${JSON.stringify(urls, null, '  ')};
        const VERSION = ${JSON.stringify(version)};
        ${swChunk.code}
      `
    },
  }
}
