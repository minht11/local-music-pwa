import {
  argbFromRgb,
  QuantizerCelebi,
  Score,
} from '@material/material-color-utilities'

const getImageData = async (blob: Blob): Promise<Uint8ClampedArray> => {
  const bitmap = await createImageBitmap(blob)

  const { width, height } = bitmap

  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error()
  }

  ctx.drawImage(bitmap, 0, 0)
  return ctx.getImageData(0, 0, width, height).data
}

export const extractColorFromImage = async (
  blob: Blob,
): Promise<number | undefined> => {
  // Firefox 91 and Safari doesn't support it yet.
  if (globalThis.OffscreenCanvas === undefined) {
    return undefined
  }

  try {
    const imageBytes = await getImageData(blob)

    const pixels: number[] = []
    for (let i = 0; i < imageBytes.length; i += 4) {
      const r = imageBytes[i]
      const g = imageBytes[i + 1]
      const b = imageBytes[i + 2]
      const a = imageBytes[i + 3]
      if (a >= 255) {
        const argb = argbFromRgb(r, g, b)
        pixels.push(argb)
      }
    }

    // Convert Pixels to Material Colors
    const result = QuantizerCelebi.quantize(pixels, 128)
    const ranked = Score.score(result)
    const top = ranked[0]

    return top
  } catch (err) {
    console.error(err)
  }

  return undefined
}
