import typescript from 'rollup-plugin-typescript2'
import ts from 'typescript'
import copy from 'rollup-plugin-copy'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonJs from 'rollup-plugin-commonjs'
import workbox from 'rollup-plugin-workbox-build'
import replace from 'rollup-plugin-replace'
import { terser } from 'rollup-plugin-terser'
import minifyHTML from 'rollup-plugin-minify-html-literals'

// npm run build -> production is true
// npm run dev -> production is false
const production = !process.env.ROLLUP_WATCH

const minify = production ? [
  minifyHTML(),
  terser(),
] : []

const mainPlugins = [
  nodeResolve({
    extensions: ['.ts', '.js'],
  }),
  commonJs(),
  typescript({
    typescript: ts,
    verbosity: 2,
    clean: true,
    sourceMap: false,
  }),
]

const mainBundle = {
  input: [
    'src/main/app.ts',
    'src/worklets/x-icon-worklet.ts',
  ],
  output: [{
    dir: 'dist/',
    format: 'es',
    sourcemap: false,
  }],
  plugins: [
    ...mainPlugins,
    ...minify,
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    copy({
      targets: {
        'src/main/static/': 'dist',
      },
      copyOnce: true,
    }),
    workbox({
      mode: 'generateSW', // or 'injectManifest'
      options: {
        swDest: 'dist/service-worker.js',
        globDirectory: 'dist',
        // other workbox-build options depending on the mode
      },
    }),
  ],
}

const workersBundle = {
  input: [
    'src/webworkers/tracks-metadata/tracks-metadata-worker.ts',
  ],
  output: [{
    dir: 'dist/',
    format: 'cjs',
    sourcemap: false,
  }],
  plugins: [
    ...mainPlugins,
    ...minify,
  ],
}

export default [
  mainBundle,
  workersBundle,
]
