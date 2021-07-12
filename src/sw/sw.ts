/// <reference lib='WebWorker' />

// IMPORTANT! This file cannot use any code also imported
// in other parts of the app or bundling into single file will fail.
declare const self: ServiceWorkerGlobalScope

// Constants from plugin
declare const ASSETS: string[]
declare const VERSION: string

export type {}

self.addEventListener('fetch', (event) => {
  const respondToRequest = async () => {
    const { request } = event
    const url = new URL(request.url)

    if (request.method === 'GET' && self.location.origin === url.origin) {
      const adjustedRequest =
        request.mode === 'navigate' ? '/index.html' : request

      return caches
        .match(adjustedRequest)
        .then((cachedRequest) => cachedRequest || fetch(request))
    }

    return fetch(request)
  }

  event.respondWith(respondToRequest())
})

self.addEventListener('install', (event) => {
  const addToCachePromise = caches
    .open(VERSION)
    .then((cache) => cache.addAll(ASSETS))

  event.waitUntil(addToCachePromise)
})

self.addEventListener('activate', (event) => {
  self.clients.claim()

  const removePromise = caches.keys().then((keys) => {
    const promises = keys.map((key) => {
      if (key === VERSION) {
        return undefined
      }

      return caches.delete(key)
    })

    return Promise.all(promises)
  })

  event.waitUntil(removePromise)
})

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting()
  }
})
