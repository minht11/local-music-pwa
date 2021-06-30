// For some reason these packages in vite build mode get compiled incorrectly,
// most likely cause is that they are published as CJS modules,
// to fix that instead import them directly from the source.
// Typescript checker will complain about initialization error, but that doesn't
// impact behavior in any way, so it is safe to ignore it.
import quantizer from '@vibrant/quantizer-mmcq/src/index'
import vibrantGenerator from '@vibrant/generator-default/lib/index'
import { Palette } from '@vibrant/color'

const getPixels = async (blob: Blob): Promise<Uint8ClampedArray> => {
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

const getMainColor = async (pixels: Uint8ClampedArray) => {
  const colors = quantizer(pixels, { colorCount: 64 })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const pallete = await (vibrantGenerator(colors) as Promise<Palette>)

  const color =
    pallete.Muted ||
    pallete.Vibrant ||
    pallete.LightVibrant ||
    pallete.DarkVibrant ||
    pallete.DarkMuted

  if (!color) {
    throw new Error()
  }

  return color
}

export const getDominantHue = async (
  blob: Blob,
): Promise<number | undefined> => {
  // Firefox 91 and Safari doesn't support it yet.
  if (globalThis.OffscreenCanvas === undefined) {
    return undefined
  }

  try {
    const pixels = await getPixels(blob)
    const color = await getMainColor(pixels)

    const [hue] = color.hsl

    return hue
  } catch (err) {
    console.error(err)
  }

  return undefined
}
