/**
 * Extract a single dominant accent color, ignoring white/gray backgrounds.
 * Two-pass approach:
 * 	1. Build a hue histogram (weighted by saturation, brightness, center bias). Pick peak hue.
 * 	2. Only count pixels near that hue, then pick most common 5-bit RGB bin.
 */
export function getPrimaryColor(pixels: Uint8ClampedArray, width: number, height: number): number {
	const SHIFT = 3 // quantize 8-bit -> 5-bit
	const BINS = 32 * 32 * 32 // 5-bit bins
	const hueBins = 180 // hue histogram bins (2° each)
	const hueWindow = 18 // accept ±18° around peak hue
	const alphaThreshold = 240 // ignore semi-transparent
	const minSat = 0.06 // ignore near-gray
	const minVal = 0.1 // ignore near-black
	const whiteSkipV = 0.96 // ignore near-white if also low sat
	const whiteSkipS = 0.12
	const satGamma = 1.8 // stronger accent preference
	const valGamma = 0.25 // small brightness weight
	const centerBias = 0.25 // 0..1: extra weight to center

	// Hue histogram
	const hueHist = new Float64Array(hueBins)

	// Gaussian center weighting setup
	const cx = (width - 1) / 2
	const cy = (height - 1) / 2
	const sigma = 0.35 * Math.min(width, height)
	const twoSigma2 = 2 * sigma * sigma

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

	// PASS 1: Fill hue histogram
	let col = 0
	let row = 0
	for (let i = 0; i < pixels.length; i += 4) {
		const a = pixels[i + 3] as number
		if (a < alphaThreshold) {
			col++
			if (col >= width) {
				col = 0
				row++
			}
			continue
		}

		const r = pixels[i] as number
		const g = pixels[i + 1] as number
		const b = pixels[i + 2] as number
		const { h, s, v } = rgb2hsv(r, g, b)

		// Skip unwanted pixels (white bg, gray, dark)
		if ((v > whiteSkipV && s < whiteSkipS) || s < minSat || v < minVal) {
			col++
			if (col >= width) {
				col = 0
				row++
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

		col++
		if (col >= width) {
			col = 0
			row++
		}
	}

	// Smooth histogram and pick peak hue
	const smooth = new Float64Array(hueBins)
	for (let i = 0; i < hueBins; i++) {
		const im1 = (i - 1 + hueBins) % hueBins
		const ip1 = (i + 1) % hueBins
		smooth[i] =
			0.5 * (hueHist[im1] as number) + (hueHist[i] as number) + 0.5 * (hueHist[ip1] as number)
	}
	let peak = 0
	for (let i = 1; i < hueBins; i++) {
		if ((smooth[i] as number) > (smooth[peak] as number)) {
			peak = i
		}
	}
	const peakHue = (peak + 0.5) * (360 / hueBins)

	// PASS 2: Build restricted 5-bit RGB histogram
	const counts = new Float64Array(BINS)
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
			col++
			if (col >= width) {
				col = 0
				row++
			}
			continue
		}

		const r = pixels[i] as number
		const g = pixels[i + 1] as number
		const b = pixels[i + 2] as number
		const { h, s, v } = rgb2hsv(r, g, b)

		if ((v > whiteSkipV && s < whiteSkipS) || s < minSat || v < minVal) {
			col++
			if (col >= width) {
				col = 0
				row++
			}
			continue
		}

		if (!inHueWindow(h)) {
			col++
			if (col >= width) {
				col = 0
				row++
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

		col++
		if (col >= width) {
			col = 0
			row++
		}
	}

	// Find winner bin
	let bestIdx = -1
	let bestW = -1
	for (let idx = 0; idx < BINS; idx++) {
		const w = counts[idx] as number
		if (w > bestW) {
			bestW = w
			bestIdx = idx
		}
	}
	if (bestIdx < 0) {
		return 0xff000000
	}

	// Decode bin center back to RGB
	const r5 = (bestIdx >> 10) & 31
	const g5 = (bestIdx >> 5) & 31
	const b5 = bestIdx & 31
	const from5 = (v5: number) => (v5 << SHIFT) + (1 << (SHIFT - 1))
	const R = from5(r5)
	const G = from5(g5)
	const B = from5(b5)

	return (0xff << 24) | (R << 16) | (G << 8) | B
}
