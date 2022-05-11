# Snae player
Lightweight on device music player right in your browser.

![alt text](https://raw.githubusercontent.com/minht11/local-music-pwa/main/images/preview.webp)

Play your local audio files without a native app, using just your browser. Complete with Dark/Light theme support, artwork based UI coloring, animations and more.

## Limitations
[File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) is relatively new api which gives websites access to the files you choose. This app makes use of it when supported, unfortunately for now that is only in Chromium based browsers. In other browsers legacy Files api is used which forces app to copy files inside IndexedDB, effectively duplicating used storage space, in oder to work correctly.
Only mp3 files are supported, more file formats might be added in future.

## Works with
With limitations in mind app works with every modern browser.

## Privacy
Minimal, privacy preserving analytics, provided by [GoatCounter](https://goatcounter.com/), are used to count page views.

## Building locally
Clone the repo, and:
```
npm install
npm run build
(optional) npm run serve
```
You can run the development server with:
```
npm run dev
```