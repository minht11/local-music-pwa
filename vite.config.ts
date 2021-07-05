import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'
import manifest from './package.json'

const createMScreenshot = (name: string, sizes: string) => ({
  sizes,
  src: `/screenshots/${name}.webp`,
  type: 'image/webp',
})

export default defineConfig({
  build: {
    target: 'esnext',
    polyfillDynamicImport: false,
    cssCodeSplit: false,
    terserOptions: {
      output: {
        comments: false,
      },
      module: true,
      compress: {
        passes: 3, // 3 passes instead of 2, because https://github.com/terser/terser/issues/969
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
        preferConst: true,
      },
    },
  },
  plugins: [
    vanillaExtractPlugin(),
    solidPlugin({
      hot: false,
    }),
    VitePWA({
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
            src: '/icons/icon_192.png',
            type: 'image/png',
            sizes: '192x192',
            purpose: 'any',
          },
          {
            src: '/icons/icon_512.png',
            type: 'image/png',
            sizes: '512x512',
            purpose: 'any',
          },
          {
            src: '/icons/maskable_icon.webp',
            type: 'image/webp',
            sizes: '512x512',
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
  optimizeDeps: {
    exclude: ['@rturnq/solid-router'],
  },
})
