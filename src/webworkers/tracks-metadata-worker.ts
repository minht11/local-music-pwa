/* @ts-ignore */ /* eslint-disable-next-line */
// declare var self: DedicatedWorkerGlobalScope

console.log('hey', self)

self.addEventListener('message', (event: MessageEvent) => {
  const files: string[] = event.data

  console.log(files)
  // const tasks = files.map(songPath => getTrackData(songPath))
  // await Promise.all(tasks)

  // @ts-ignore
  self.postMessage(true)
})

self.onmessage = () => {
  console.log('hey')
}
