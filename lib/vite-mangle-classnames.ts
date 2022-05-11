import { PluginOption } from 'vite'
import csstree from 'css-tree'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cssClassGenerator from 'css-class-generator'

export const mangleClassNames = (): PluginOption => ({
  apply: 'build',
  enforce: 'post',
  name: 'mangle-css-class-names',
  generateBundle(_, bundle, isWrite) {
    if (!isWrite) {
      return
    }
    const classNamesMap = new Map<string, string>()

    let index = 0
    const fileEntries = Object.entries(bundle)

    for (const [fileName, file] of fileEntries) {
      if (
        file.type === 'asset' &&
        fileName.endsWith('.css') &&
        typeof file.source === 'string'
      ) {
        const ast = csstree.parse(file.source)

        /* eslint-disable no-loop-func */
        csstree.walk(ast, (node) => {
          if (node.type === 'ClassSelector') {
            const { name } = node
            let mangledName = classNamesMap.get(name)

            if (mangledName === undefined) {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call
              mangledName = cssClassGenerator(index) as string
              classNamesMap.set(name, mangledName)
              index += 1
            }

            node.name = mangledName
          }
        })
        file.source = csstree.generate(ast)
      }
    }

    for (const [fileName, file] of fileEntries) {
      if (file.type === 'chunk' && fileName.endsWith('.js')) {
        for (const [name, mangledName] of classNamesMap.entries()) {
          file.code = file.code.replaceAll(
            new RegExp(`\\b${name}\\b`, 'g'),
            mangledName,
          )
        }
      }
    }
  },
})
