/** biome-ignore-all lint/style/useNumericSeparators: exception */

// Dominant accent color extraction in OKLCh.
//
// Pipeline:
//   pixels → OKLCh per pixel → filter background/gray/black/white
//          → hue histogram weighted by vividness·lightness·center bias
//          → smoothed peak hue (with deterministic tie-breaking)
//          → soft hue window → chroma×lightness shade histogram
//          → weighted average of actual pixels in the winning shade
//
// OKLCh notes:
//  - L (lightness) is perceptual, 0..1. Unlike HSV value, equal L means
//    equal perceived brightness across hues.
//  - C (chroma) is absolute colorfulness, but its sRGB-gamut maximum varies
//    by hue (~0.21 for yellows, ~0.31 for blues). Raw chroma weighting would
//    systematically favor high-gamut hues, so all chroma here is normalized
//    by the per-hue gamut maximum into "vividness" ∈ 0..1 — the OKLCh
//    analogue of HSV saturation.
//  - The final color is averaged from actual sRGB pixels, so no inverse
//    OKLCh→sRGB transform (and no gamut clipping) is ever needed.

const hueBins = 360 // hue histogram resolution (1° bins)
const hueWindow = 24 // soft window: full weight at peak → 0 at ±24°
const alphaThreshold = 240 // ignore semi-transparent pixels
const vividnessFloor = 0.1 // hard floor: below this is treated as gray
const minLightness = 0.25 // ignore near-black (OKLab L; perceptually scaled)
const whiteSkipL = 0.92 // reject near-white / pale tints…
const whiteSkipVividness = 0.25 // …up to this vividness
const centerBias = 0.15 // image-center bias strength
const CL_BINS = 32 // chroma × lightness shade histogram resolution
const smoothSigma = 3 // hue histogram Gaussian smoothing, in bins (≈ °)
const tieThreshold = 0.9 // peaks within 90% of the max compete for tie-break

// sRGB → OKLCh conversion
// 8-bit sRGB channel → linear, precomputed
const LINEAR = new Float32Array(256)
for (let i = 0; i < 256; i += 1) {
	const c = i / 255
	LINEAR[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

// Reusable out-param: [hue°, chroma, lightness]. Avoids per-pixel allocation.
const lch = new Float32Array(3)

const rgb2oklch = (r8: number, g8: number, b8: number): void => {
	const r = LINEAR[r8] as number
	const g = LINEAR[g8] as number
	const b = LINEAR[b8] as number

	// linear sRGB → LMS (OKLab M1), nonlinearity, → OKLab (M2)
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

	const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
	const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
	const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

	// atan2 ∈ (-180°, 180°] → [0°, 360°)
	lch[0] = ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
	lch[1] = Math.sqrt(A * A + B * B)
	lch[2] = L
}

// Map a hue in [0°, 360°] to a histogram bin. 360 wraps to bin 0: hues are
// produced in [0, 360), but float32 storage can round e.g. 359.99998 up to
// exactly 360.
const hueBin = (h: number, bins: number): number => {
	const k = ((h / 360) * bins) | 0
	return k >= bins ? 0 : k
}

// Per-hue maximum chroma within the sRGB gamut, for chroma → vividness
// normalization. Max chroma always lies on the gamut surface, so scanning
// the six faces of the RGB cube suffices.
const CMAX_BINS = 36 // 10° resolution is plenty for normalization
const cmaxByHue = new Float32Array(CMAX_BINS)
{
	const FACE_STEP = 4 // 64×64 samples per face
	const sample = (r: number, g: number, b: number): void => {
		rgb2oklch(r, g, b)
		const k = hueBin(lch[0] as number, CMAX_BINS)
		if ((lch[1] as number) > (cmaxByHue[k] as number)) {
			cmaxByHue[k] = lch[1] as number
		}
	}
	for (let u = 0; u < 256; u += FACE_STEP) {
		for (let v = 0; v < 256; v += FACE_STEP) {
			sample(0, u, v)
			sample(255, u, v)
			sample(u, 0, v)
			sample(u, 255, v)
			sample(u, v, 0)
			sample(u, v, 255)
		}
	}
}

// Circular Gaussian smoothing for the hue histograms. Radius 3σ captures
// >99% of the kernel mass.
const kernelRadius = Math.ceil(3 * smoothSigma)
const kernel = new Float32Array(2 * kernelRadius + 1)
for (let k = -kernelRadius; k <= kernelRadius; k += 1) {
	kernel[k + kernelRadius] = Math.exp(-(k * k) / (2 * smoothSigma * smoothSigma))
}

const smoothCircular = (src: Float32Array, dst: Float32Array): void => {
	for (let i = 0; i < hueBins; i += 1) {
		let acc = 0
		for (let k = -kernelRadius; k <= kernelRadius; k += 1) {
			const j = (i + k + hueBins) % hueBins
			acc += (kernel[k + kernelRadius] as number) * (src[j] as number)
		}
		dst[i] = acc
	}
}

// Reusable scratch buffers. Module-level for zero steady-state allocation in
// batch pipelines. Safe because getPrimaryColor is fully synchronous (JS
// cannot interleave sync calls). If this function ever becomes async, these
// must move back inside the function or be guarded.

// Fixed-size
const hueHist = new Float32Array(hueBins) // Σ w per hue bin
const hueVividHist = new Float32Array(hueBins) // Σ w·vividness (tie-breaking)
const smooth = new Float32Array(hueBins)
const smoothVivid = new Float32Array(hueBins)
const clCounts = new Float32Array(CL_BINS * CL_BINS)
const clR = new Float32Array(CL_BINS * CL_BINS)
const clG = new Float32Array(CL_BINS * CL_BINS)
const clB = new Float32Array(CL_BINS * CL_BINS)

/** @public */
export const SMALL_ARTWORK_IMAGE_WIDTH = 100

// Per-candidate caches, densely packed in pass 1 and grown on demand.
// candidates[c] holds the pixel index, so pass 2 touches only accepted
// pixels and these arrays never need resetting.
let candidates = new Uint32Array(SMALL_ARTWORK_IMAGE_WIDTH * SMALL_ARTWORK_IMAGE_WIDTH)
let hues = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH * SMALL_ARTWORK_IMAGE_WIDTH)
let vividnesses = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH * SMALL_ARTWORK_IMAGE_WIDTH)
let lightnesses = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH * SMALL_ARTWORK_IMAGE_WIDTH)
let weights = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH * SMALL_ARTWORK_IMAGE_WIDTH)
let wx = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH)
let wy = new Float32Array(SMALL_ARTWORK_IMAGE_WIDTH)

const ensureCapacity = (n: number, width: number, height: number): void => {
	if (candidates.length < n) {
		candidates = new Uint32Array(n)
		hues = new Float32Array(n)
		vividnesses = new Float32Array(n)
		lightnesses = new Float32Array(n)
		weights = new Float32Array(n)
	}
	if (wx.length < width) {
		wx = new Float32Array(width)
	}
	if (wy.length < height) {
		wy = new Float32Array(height)
	}
}

// Sum a 3×3 neighborhood (edge-clamped) of one CL-grid array
const sumNeighborhood = (arr: Float32Array, cb: number, lb: number): number => {
	let acc = 0
	for (let ci = Math.max(cb - 1, 0); ci <= Math.min(cb + 1, CL_BINS - 1); ci += 1) {
		for (let li = Math.max(lb - 1, 0); li <= Math.min(lb + 1, CL_BINS - 1); li += 1) {
			acc += arr[ci * CL_BINS + li] as number
		}
	}

	return acc
}

const packArgb = (r: number, g: number, b: number): number =>
	((0xff << 24) | (r << 16) | (g << 8) | b) >>> 0

/**
 * Extract a single dominant accent color, ignoring white/gray backgrounds.
 *
 * Falls back to the center-weighted average of opaque pixels (rather than
 * constant black) when the image has no sufficiently chromatic pixels, e.g.
 * grayscale artwork. Returns `undefined` for fully transparent input.
 *
 * Deterministic per content. Uses module-level scratch buffers: zero
 * steady-state allocation, must remain synchronous (see buffer comment).
 */
export function getPrimaryColor(
	pixels: Uint8ClampedArray,
	width: number,
	height: number,
): number | undefined {
	const n = width * height
	ensureCapacity(n, width, height)

	hueHist.fill(0)
	hueVividHist.fill(0)
	clCounts.fill(0)
	clR.fill(0)
	clG.fill(0)
	clB.fill(0)

	// Separable Gaussian center weighting: exp(-(dx²+dy²)/2σ²) = wx[col]·wy[row]
	const cx = (width - 1) / 2
	const cy = (height - 1) / 2
	const sigma = 0.35 * Math.min(width, height)
	const twoSigma2 = 2 * sigma * sigma

	for (let x = 0; x < width; x += 1) {
		const dx = x - cx
		wx[x] = Math.exp(-(dx * dx) / twoSigma2)
	}
	for (let y = 0; y < height; y += 1) {
		const dy = y - cy
		wy[y] = Math.exp(-(dy * dy) / twoSigma2)
	}

	// Fallback: center-weighted average of opaque pixels, so grayscale
	// artwork falls back to its subject rather than its borders.
	let fbR = 0
	let fbG = 0
	let fbB = 0
	let fbW = 0

	// PASS 1: hue histograms + compacted candidate cache
	let candidateCount = 0
	let i = 0
	let p = 0
	for (let row = 0; row < height; row += 1) {
		const rowW = wy[row] as number
		for (let col = 0; col < width; col += 1, p += 1, i += 4) {
			const a = pixels[i + 3] as number
			if (a < alphaThreshold) {
				continue
			}

			const r = pixels[i] as number
			const g = pixels[i + 1] as number
			const b = pixels[i + 2] as number

			const centerW = (wx[col] as number) * rowW

			fbR += r * centerW
			fbG += g * centerW
			fbB += b * centerW
			fbW += centerW

			rgb2oklch(r, g, b)
			const h = lch[0] as number
			const L = lch[2] as number

			// chroma → vividness via per-hue gamut maximum
			const cmax = cmaxByHue[hueBin(h, CMAX_BINS)] as number
			const vivid = Math.min((lch[1] as number) / cmax, 1)

			// Hard floors for true gray, near-black, and (possibly pale)
			// near-white. Low-but-real vividness is suppressed smoothly by
			// the vivid² weighting rather than a cliff. Lightness keeps a
			// hard floor: √L grows fast at low L and cannot suppress dark
			// noise.
			if (
				vivid < vividnessFloor ||
				L < minLightness ||
				(L > whiteSkipL && vivid < whiteSkipVividness)
			) {
				continue
			}

			// Weight = vivid² · √L, blended with center weighting:
			// (1-bias)·w + bias·w·center == w·(1 - bias + bias·center)
			const centerFactor = 1 - centerBias + centerBias * centerW
			const w = vivid * vivid * Math.sqrt(L) * centerFactor

			candidates[candidateCount] = p
			hues[candidateCount] = h
			vividnesses[candidateCount] = vivid
			lightnesses[candidateCount] = L
			weights[candidateCount] = w
			candidateCount += 1

			const bin = hueBin(h, hueBins)
			;(hueHist[bin] as number) += w
			;(hueVividHist[bin] as number) += w * vivid
		}
	}

	if (fbW === 0) {
		// Fully transparent image: nothing to sample
		return undefined
	}

	const fallbackColor = (): number =>
		packArgb(Math.round(fbR / fbW), Math.round(fbG / fbW), Math.round(fbB / fbW))

	if (candidateCount === 0) {
		// Grayscale / near-black / near-white artwork
		return fallbackColor()
	}

	// Smooth both histograms identically. σ ≈ 3° absorbs JPEG hue scatter so
	// the peak reflects a cluster, not a lucky bin.
	smoothCircular(hueHist, smooth)
	smoothCircular(hueVividHist, smoothVivid)

	// Global max and its position. argmax doubles as the fallback peak when
	// no local maximum qualifies below (e.g. a perfectly flat histogram).
	let argmax = 0
	let maxVal = 0
	for (let k = 0; k < hueBins; k += 1) {
		if ((smooth[k] as number) > maxVal) {
			maxVal = smooth[k] as number
			argmax = k
		}
	}

	// Deterministic tie-breaking: among local maxima within tieThreshold of
	// the global max, prefer the most vivid hue (mean vividness =
	// smoothVivid/smooth); exact ties resolve to the lowest bin. Keeps
	// two-tone artwork from flipping color family on re-encode noise.
	let peak = argmax
	let peakMeanVivid = -1
	const cutoff = tieThreshold * maxVal
	for (let k = 0; k < hueBins; k += 1) {
		const sv = smooth[k] as number
		if (sv < cutoff) {
			continue
		}
		const km1 = (k - 1 + hueBins) % hueBins
		const kp1 = (k + 1) % hueBins
		if (sv < (smooth[km1] as number) || sv < (smooth[kp1] as number)) {
			continue // not a local maximum
		}
		const meanVivid = (smoothVivid[k] as number) / sv
		if (meanVivid > peakMeanVivid) {
			peak = k
			peakMeanVivid = meanVivid
		}
	}

	// Sub-bin refinement: parabola through the peak and neighbors removes 1°
	// quantization jitter between near-identical images.
	const y0 = smooth[(peak - 1 + hueBins) % hueBins] as number
	const y1 = smooth[peak] as number
	const y2 = smooth[(peak + 1) % hueBins] as number
	const denom = y0 - 2 * y1 + y2
	const offset = denom === 0 ? 0 : 0.5 * ((y0 - y2) / denom)
	const peakHue = (peak + 0.5 + offset) * (360 / hueBins)

	// PASS 2: chroma × lightness shade histogram within a soft hue window.
	// Cosine falloff avoids hard-cutoff twitchiness and keeps the averaged
	// color anchored to the peak hue.
	for (let c = 0; c < candidateCount; c += 1) {
		const h = hues[c] as number

		let dh = Math.abs(h - peakHue)
		dh = Math.min(dh, 360 - dh)
		if (dh > hueWindow) {
			continue
		}
		const hueW = 0.5 + 0.5 * Math.cos((dh / hueWindow) * Math.PI)

		const vivid = vividnesses[c] as number
		const L = lightnesses[c] as number
		const w = (weights[c] as number) * hueW

		const cBin = Math.min((vivid * CL_BINS) | 0, CL_BINS - 1)
		const lBin = Math.min((L * CL_BINS) | 0, CL_BINS - 1)
		const idx = cBin * CL_BINS + lBin

		const base = (candidates[c] as number) * 4
		;(clCounts[idx] as number) += w
		;(clR[idx] as number) += (pixels[base] as number) * w
		;(clG[idx] as number) += (pixels[base + 1] as number) * w
		;(clB[idx] as number) += (pixels[base + 2] as number) * w
	}

	// Winning shade: argmax over 3×3 neighborhoods so a cluster straddling a
	// bin boundary isn't outvoted by a smaller cluster that happens to sit
	// centered in one cell.
	let bestC = 0
	let bestL = 0
	let bestScore = 0
	for (let cb = 0; cb < CL_BINS; cb += 1) {
		for (let lb = 0; lb < CL_BINS; lb += 1) {
			const score = sumNeighborhood(clCounts, cb, lb)
			if (score > bestScore) {
				bestScore = score
				bestC = cb
				bestL = lb
			}
		}
	}

	const sumW = sumNeighborhood(clCounts, bestC, bestL)
	if (sumW === 0) {
		// Should be unreachable (the peak hue came from these candidates),
		// but guard against float edge cases.
		return fallbackColor()
	}

	// Weighted average of actual pixel colors in the winning neighborhood
	return packArgb(
		Math.round(sumNeighborhood(clR, bestC, bestL) / sumW),
		Math.round(sumNeighborhood(clG, bestC, bestL) / sumW),
		Math.round(sumNeighborhood(clB, bestC, bestL) / sumW),
	)
}
