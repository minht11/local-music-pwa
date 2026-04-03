const SHIFT = 3 // quantize 8-bit -> 5-bit
const BINS = 32 * 32 * 32 // 5-bit bins
const hueBins = 360 // hue histogram bins (1° each) - increased for better resolution
const hueWindow = 24 // accept ±24° around peak hue
const alphaThreshold = 240 // ignore semi-transparent
const minSat = 0.15 // ignore near-gray - increased to focus on vibrant colors
const minVal = 0.15 // ignore near-black - increased to avoid dark noise
const whiteSkipV = 0.94 // ignore near-white if also low sat
const whiteSkipS = 0.15
const satGamma = 2.2 // stronger accent preference for vibrant colors
const valGamma = 0.4 // moderate brightness weight
const centerBias = 0.15 // reduced center bias to avoid missing off-center accents

// Helper: convert RGB → HSV
function rgb2hsv(r: number, g: number, b: number) {
	const rf = r / 255
	const gf = g / 255
	const bf = b / 255

	const max = Math.max(rf, gf, bf)
	const min = Math.min(rf, gf, bf)
	const d = max - min

	let h = 0
	if (d > 0) {
		if (max === rf) {
			h = ((gf - bf) / d + (gf < bf ? 6 : 0)) * 60
		} else if (max === gf) {
			h = ((bf - rf) / d + 2) * 60
		} else {
			h = ((rf - gf) / d + 4) * 60
		}
	}

	const s = max === 0 ? 0 : d / max
	const v = max

	return { h, s, v }
}

/**
 * Extract a single dominant accent color, ignoring white/gray backgrounds.
 * Two-pass approach:
 * 	1. Build a hue histogram (weighted by saturation, brightness, center bias). Pick peak hue.
 * 	2. Only count pixels near that hue, then pick most common 5-bit RGB bin.
 */
export function getPrimaryColor(pixels: Uint8ClampedArray, width: number, height: number): number {
	// Hue histogram
	const hueHist = new Float64Array(hueBins)

	// Gaussian center weighting setup
	const cx = (width - 1) / 2
	const cy = (height - 1) / 2
	const sigma = 0.35 * Math.min(width, height)
	const twoSigma2 = 2 * sigma * sigma

	// PASS 1: Fill hue histogram
	let col = 0
	let row = 0
	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3] as number
		if (a < alphaThreshold) {
			col += 1
			if (col >= width) {
				col = 0
				row += 1
			}
			continue
		}

		const r = pixels[i] as number
		const g = pixels[i + 1] as number
		const b = pixels[i + 2] as number
		const { h, s, v } = rgb2hsv(r, g, b)

		// Skip unwanted pixels (white bg, gray, dark)
		if ((v > whiteSkipV && s < whiteSkipS) || s < minSat || v < minVal) {
			col += 1
			if (col >= width) {
				col = 0
				row += 1
			}
			continue
		}

		// Weight = saturation^γ * brightness^γ * centerWeight
		let w = s ** satGamma * v ** valGamma
		const dx = col - cx
		const dy = row - cy
		const centerW = Math.exp(-(dx * dx + dy * dy) / twoSigma2)
		w = (1 - centerBias) * w + centerBias * (w * centerW)

		const bin = Math.floor((h / 360) * hueBins) % hueBins
		;(hueHist[bin] as number) += w

		col += 1
		if (col >= width) {
			col = 0
			row += 1
		}
	}

	// Smooth histogram and pick peak hue
	const smooth = new Float64Array(hueBins)
	for (let i = 0; i < hueBins; i += 1) {
		const im1 = (i - 1 + hueBins) % hueBins
		const ip1 = (i + 1) % hueBins
		smooth[i] =
			0.5 * (hueHist[im1] as number) + (hueHist[i] as number) + 0.5 * (hueHist[ip1] as number)
	}
	let peak = 0
	for (let i = 1; i < hueBins; i += 1) {
		if ((smooth[i] as number) > (smooth[peak] as number)) {
			peak = i
		}
	}
	const peakHue = (peak + 0.5) * (360 / hueBins)

	// PASS 2: Build restricted RGB histogram and track actual pixel colors
	const counts = new Float64Array(BINS)
	const rSums = new Float64Array(BINS)
	const gSums = new Float64Array(BINS)
	const bSums = new Float64Array(BINS)
	col = 0
	row = 0

	function inHueWindow(h: number) {
		let dh = Math.abs(h - peakHue)
		dh = Math.min(dh, 360 - dh)
		return dh <= hueWindow
	}

	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3] as number
		if (a < alphaThreshold) {
			col += 1
			if (col >= width) {
				col = 0
				row += 1
			}
			continue
		}

		const r = pixels[i] as number
		const g = pixels[i + 1] as number
		const b = pixels[i + 2] as number
		const { h, s, v } = rgb2hsv(r, g, b)

		if ((v > whiteSkipV && s < whiteSkipS) || s < minSat || v < minVal) {
			col += 1
			if (col >= width) {
				col = 0
				row += 1
			}
			continue
		}

		if (!inHueWindow(h)) {
			col += 1
			if (col >= width) {
				col = 0
				row += 1
			}
			continue
		}

		let w = s ** satGamma * v ** valGamma
		const dx = col - cx
		const dy = row - cy
		const centerW = Math.exp(-(dx * dx + dy * dy) / twoSigma2)
		w = (1 - centerBias) * w + centerBias * (w * centerW)

		const idx = ((r >> SHIFT) << 10) | ((g >> SHIFT) << 5) | (b >> SHIFT)
		;(counts[idx] as number) += w
		;(rSums[idx] as number) += r * w
		;(gSums[idx] as number) += g * w
		;(bSums[idx] as number) += b * w

		col += 1
		if (col >= width) {
			col = 0
			row += 1
		}
	}

	// Find winner bin
	let bestIdx = -1
	let bestW = -1
	for (let idx = 0; idx < BINS; idx += 1) {
		const w = counts[idx] as number
		if (w > bestW) {
			bestW = w
			bestIdx = idx
		}
	}
	if (bestIdx < 0 || bestW === 0) {
		return 0xff_00_00_00
	}

	// Calculate weighted average of actual pixel colors in the winning bin
	const R = Math.round((rSums[bestIdx] as number) / bestW)
	const G = Math.round((gSums[bestIdx] as number) / bestW)
	const B = Math.round((bSums[bestIdx] as number) / bestW)

	return (0xff << 24) | (R << 16) | (G << 8) | B
}
