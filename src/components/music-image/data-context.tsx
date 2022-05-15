import { ParentComponent, createContext } from 'solid-js'

interface ImageDate {
  url: string
  users: Set<symbol>
}

type ImagesDataProps = {
  get(blob: Blob, userKey: symbol): string
  release(blob: Blob, userKey: symbol): void
}

export const MusicImagesContext = createContext<ImagesDataProps>()

export const MusicImagesProvider: ParentComponent = (props) => {
  const musicImagesMap = new WeakMap<Blob, ImageDate>()
  const releaseQueue = new Set<Blob>()

  let releaseQueueTimeoutID: number | null = null

  const freeUpMemory = () => {
    for (const blob of releaseQueue.keys()) {
      const data = musicImagesMap.get(blob)
      if (data && data.users.size === 0) {
        musicImagesMap.delete(blob)
      }
    }
    releaseQueue.clear()
  }

  const release = (blob: Blob, userKey: symbol) => {
    const data = musicImagesMap.get(blob)
    if (!data) {
      return
    }

    data.users.delete(userKey)
    releaseQueue.add(blob)

    if (releaseQueueTimeoutID === null) {
      releaseQueueTimeoutID = window.setTimeout(() => {
        releaseQueueTimeoutID = null
        freeUpMemory()
      }, 4000)
    }
  }

  const get = (blob: Blob, userKey: symbol) => {
    const data = musicImagesMap.get(blob)
    if (data) {
      data.users.add(userKey)
      return data.url
    }

    const imageURL = URL.createObjectURL(blob)
    musicImagesMap.set(blob, {
      url: imageURL,
      users: new Set([userKey]),
    })
    return imageURL
  }

  return (
    <MusicImagesContext.Provider value={{ get, release }}>
      {props.children}
    </MusicImagesContext.Provider>
  )
}
