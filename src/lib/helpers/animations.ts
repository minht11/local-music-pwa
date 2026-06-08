/** @public */
export const animateEmpty = (
	element: Element,
	options: number | KeyframeAnimationOptions,
): Animation => element.animate(null, options)

export interface SequenceKeyframeAnimationOptions extends KeyframeAnimationOptions {
	/** '<' means start at the same time as previous animation */
	at?: '<'
}

export type AnimationSequence = [
	Element,
	Keyframe[] | PropertyIndexedKeyframes,
	SequenceKeyframeAnimationOptions?,
]

export interface AnimationSequenceOptions {
	defaultOptions?: KeyframeAnimationOptions
}

export const timeline = async (
	sequence: readonly AnimationSequence[],
	sequenceOptions: AnimationSequenceOptions = {},
): Promise<Animation[]> => {
	const animations: readonly [Animation, runWithPrevious: boolean][] = sequence.map(
		([element, keyframes, options]) => {
			const animation = element.animate(keyframes, {
				...sequenceOptions.defaultOptions,
				...options,
			})
			animation.pause()

			return [animation, options?.at === '<']
		},
	)

	const promises: Promise<Animation>[] = []
	for (const [animation, runWithPrevious] of animations) {
		if (!runWithPrevious) {
			await promises.at(-1)
		}

		animation.play()
		promises.push(animation.finished)
	}

	return Promise.all(promises)
}

const easings = [
	'standard',
	'outgoing40',
	'incoming80',
	'incoming80outgoing40',
	'standardDecelerate',
	'standardAccelerate',
] as const
type EasingName = (typeof easings)[number]
let cachedEasings: Record<EasingName, string> | null = null

/** @public */
export const getEasing = (easing: EasingName) => {
	if (cachedEasings) {
		return cachedEasings[easing]
	}

	const styles = window.getComputedStyle(document.documentElement)

	cachedEasings = {} as Record<EasingName, string>
	for (const easing of easings) {
		const value = styles.getPropertyValue(`--e-${easing}`).trim()
		invariant(value, `Easing ${easing} not found in CSS variables`)

		cachedEasings[easing] = value
	}

	return cachedEasings[easing]
}

interface AnimateBackdropOptions {
	isOut?: boolean
	duration?: number
	easing?: string
}

/** @public */
export const animateBackdrop = (
	dialog: HTMLDialogElement,
	options: AnimateBackdropOptions = {},
) => {
	const { isOut = false, duration = 300, easing = 'linear' } = options
	try {
		dialog.animate(
			{
				opacity: isOut ? [1, 0] : [0, 1],
			},
			{
				pseudoElement: '::backdrop',
				duration,
				easing,
				fill: isOut ? 'forwards' : undefined,
			},
		)
	} catch (err) {
		// Firefox does not support pseudo-element animations
		// https://bugzilla.mozilla.org/show_bug.cgi?id=1770591
		if (import.meta.env.DEV) {
			console.warn(err)
		}
	}
}
