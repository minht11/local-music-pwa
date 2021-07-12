import { PluginOption } from 'vite'

export interface Options {
  input: string[]
}

export const injectScriptsToHtmlDuringBuild = (
  pluginOptions: Options,
): PluginOption => {
  let inputFileRefs: string[] = []
  let inputFileNames: string[] = []

  return {
    enforce: 'pre',
    apply: 'build',
    name: 'inject-script-to-html-during-build',
    buildStart() {
      inputFileRefs = pluginOptions.input.map((file) =>
        this.emitFile({ type: 'chunk', id: file }),
      )
    },
    generateBundle() {
      inputFileNames = inputFileRefs.map((id) => this.getFileName(id))
    },
    transformIndexHtml: {
      enforce: 'post',
      transform() {
        return inputFileNames.map((src) => ({
          tag: 'script',
          attrs: {
            src,
            type: 'module',
            async: true,
          },
          injectTo: 'head',
        }))
      },
    },
  }
}
