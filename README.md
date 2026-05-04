# Snae Player

**[snaeplayer.com](https://snaeplayer.com)** - Local music player in the browser.

Play audio files stored on your device. Includes playlists, queue, favorites, equalizer, playback speed, and artwork-based theming.

<p align="center">
  <img src="https://raw.githubusercontent.com/minht11/local-music-pwa/main/src/routes/(marketing)/assets/hero.avif" height="400" alt="Snae Player showing the music library and playback controls" />
</p>

## Browser support

Works in all modern browsers. When the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) is available, currently Chromium-based browsers, the app reads files directly from your chosen folder. In other browsers, files are copied into IndexedDB, which doubles the storage used.

## Privacy

Your music files and library data stay on your device. The app does not collect or transmit them.

Page views are counted using [GoatCounter](https://goatcounter.com/), a minimal privacy-preserving analytics tool.

## Tech stack

SvelteKit/Svelte 5 · TypeScript · Tailwind CSS 4

## Building locally

Clone the repo, then:

```
pnpm install
pnpm run build
```

Or run the development server:

```
pnpm run dev
```
