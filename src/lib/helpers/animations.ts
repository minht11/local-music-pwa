export const animateEmpty = (element: Element, options: number | KeyframeAnimationOptions) =>
	element.animate(null, options)

export interface SequenceKeyframeAnimationOptions extends KeyframeAnimationOptions {
	/** '<' means start at the same time as previous animation */
	at?: '<' | 'after'
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
) => {
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
