export const getRandomId = (identifier?: string | number) => `${identifier}${new Date().getTime()}`

export const getRandomInt = (max: number) => Math.floor(Math.random() * Math.floor(max))

export const chunkArray = (givenArray: unknown[], chunkSize: number): unknown[] => {
  const results: unknown[] = []

  while (givenArray.length) {
    results.push(givenArray.splice(0, chunkSize))
  }

  return results
}

export const nullToUnknown = (value?: string): string => {
  if (value === null || value === undefined) {
    return 'Unknown'
  }
  return value
}

const DEFAULT_IMAGE = '/images/artwork.jpg'

const urlList = new Map<number, string>()
export const getImageUrl = (track: { id: number, image: Blob | string | undefined }): string => {
  try {
    const { id, image } = track
    if (typeof image === 'string') {
      return image
    }
    if (id) {
      const imgUrl = urlList.get(id)
      if (imgUrl) {
        return imgUrl
      }
      if (image) {
        const newImgUrl = URL.createObjectURL(image)
        urlList.set(id, newImgUrl)
        return newImgUrl
      }
    }
    return DEFAULT_IMAGE
  } catch {
    return DEFAULT_IMAGE
  }
}


const getLeadingZero = (n: number) => `${n < 10 ? '0' : ''}${n}`

export const formatTime = (duration?: number): string => {
  if (!duration || Number.isNaN(duration)) {
    return '--:--'
  }

  const hours = Math.floor(duration / 60 / 60)
  const minutes = Math.floor((duration % 3600) / 60)
  const seconds = Math.floor((duration % 3600) % 60)
  const time: (number | string)[] = [getLeadingZero(minutes), getLeadingZero(seconds)]

  if (hours) {
    time.unshift(hours)
  }

  return time.join(':')
}

export const formatBytesToSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes === 0) {
    return '0'
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  if (i === 0) {
    return `${bytes} ${sizes[i]}`
  }
  return `${(bytes / (1024 ** i)).toFixed(1)}${sizes[i]}`
}

export function swapArrayItems<T>(
  array: T[],
  firstItemIndex: number,
  secondItemIndex: number,
): T[] {
  const arrayRef = array
  const temporaryValue = arrayRef[firstItemIndex]
  arrayRef[firstItemIndex] = arrayRef[secondItemIndex]
  arrayRef[secondItemIndex] = temporaryValue
  return arrayRef
}
