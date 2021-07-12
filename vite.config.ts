import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { minifyHtml } from 'vite-plugin-html'
import manifest from './package.json'
import { mangleClassNames } from './lib/vite-mangle-classnames'
import { injectScriptsToHtmlDuringBuild } from './lib/vite-inject-scripts-to-html'
import { serviceWorker } from './lib/vite-service-worker'

const createMScreenshot = (name: string, sizes: string) => ({
  sizes,
  src: `/screenshots/${name}.webp`,
  type: 'image/webp',
})

export default defineConfig({
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
    cleanCssOptions: {
      level: 2,
    },
    cssCodeSplit: false,
    terserOptions: {
      output: {
        comments: false,
      },
      module: true,
      compress: {
        // 2 or more passes break __vitePreloadHelper
        // passes: 2,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_arrows: true,
      },
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
    },
    rollupOptions: {
      output: {
        // Disable vendor chunk.
        manualChunks: undefined,
        preferConst: true,
      },
    },
  },
  plugins: [
    minifyHtml(),
    // Vite always bundles or imports all scripts into one file.
    // In unsupported browsers we want to display error message about it,
    // but because everything is bundled into one file, main app bundle
    // fails to load because of syntax errors and no message is displayed.
    // This plugin fixes that by emiting script separetly
    // and including it inside html.
    injectScriptsToHtmlDuringBuild({
      input: ['./src/disable-app-if-not-supported.ts'],
    }),
    // If https://github.com/seek-oss/vanilla-extract/discussions/222 is ever implemented,
    // this plugin can be replaced.
    mangleClassNames(),
    vanillaExtractPlugin(),
    solidPlugin({
      hot: false,
    }),
    serviceWorker({
      manifest: {
        short_name: 'Snae',
        name: 'Snae player',
        start_url: '/',
        scope: '../',
        theme_color: '#1a1a1a',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        description: manifest.description,
        icons: [
          {
            src: '/icons/icon_responsive.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'any',
          },
          {
            src: '/icons/icon_maskable.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          createMScreenshot('small_1', '1079x1919'),
          createMScreenshot('small_2', '1079x1919'),
          createMScreenshot('small_3', '1079x1919'),
          createMScreenshot('medium_1', '1276x960'),
          createMScreenshot('medium_2', '1276x960'),
          createMScreenshot('medium_3', '1276x960'),
        ],
      },
    }),
  ],
})
