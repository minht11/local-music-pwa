# local-music-pwa
Music player which plays your local files inside your browser and also is PWA.

![alt text](https://raw.githubusercontent.com/minht11/local-music-pwa/master/image.png)

This is work in progress

## Limitations
[Native FileSystem](https://github.com/WICG/native-file-system) is coming to the web, but for now only Chrome partially supports it behind the flag as does this app. Full support should come sometime early-mid 2020. In order to work on all other browser which does not yet support it, instead of caching only reference to file <b>file itself must be saved inside IndexedDB</b> for further uses, this won't be needed once NFS comes out.

## Works with
While it should work with all latests major browsers as of yet it's only been tested on recent stable desktop versions of Firefox and Chrome. Optimizations for older and other browsers TBD.

## Future work
- Focus on mobile experience.
- More robust library filtering and searching options
- General performance and ui improvements.

## Run locally

- `git clone https://github.com/minht11/local-music-pwa`
- `cd local-music-pwa`
- `npm install`
- `npm run build` or `npm run watch`
- Start the app using `npm start`
