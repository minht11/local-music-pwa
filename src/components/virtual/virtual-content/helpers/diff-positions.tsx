import { createArray } from '../../../../utils'

export const ELEMENT_USED_FOR_FOCUS_COUNT = 1

interface DiffPositionsOptions {
  total: number
  focusPosition: number
  positionCount: number
  startPosition: number
  prevStartPosition: number
  prevPositions: number[]
}

export const diffPositions = (options: DiffPositionsOptions) => {
  const {
    total,
    focusPosition,
    positionCount,
    startPosition,
    prevPositions,
    prevStartPosition,
  } = options

  const prevPositionsCount = prevPositions.length

  const arePositionsStatic = total <= positionCount

  if (arePositionsStatic) {
    if (
      prevPositionsCount === positionCount &&
      prevStartPosition === startPosition
    ) {
      return prevPositions
    }

    return createArray(0, positionCount)
  }

  const endPosition = startPosition + positionCount
  const isPositionOutOfBounds = (pos: number) =>
    pos < startPosition || pos >= endPosition

  // Focused position must remain static,
  // so add one more position.
  const findExpandedPositionForFocus = () => {
    if (isPositionOutOfBounds(focusPosition)) {
      return focusPosition
    }

    let newPosition
    if (endPosition < total) {
      newPosition = endPosition
      // At the very end of the list there is nowhere to add new postion
      // so instead insert it before startPosition.
    } else {
      newPosition = startPosition - 1
    }

    return newPosition
  }

  const newPositionsTotalCount = positionCount + ELEMENT_USED_FOR_FOCUS_COUNT

  // If arrays are different size diffing won't work.
  // This ussually happens when layout size changes.
  if (prevPositionsCount !== newPositionsTotalCount) {
    const newPositions = createArray(startPosition, positionCount)
    newPositions.push(findExpandedPositionForFocus())

    return newPositions
  }

  const unusedPositions: number[] = []
  for (let i = 0; i < positionCount; i += 1) {
    const position = startPosition + i

    if (!prevPositions.includes(position)) {
      unusedPositions.push(position)
    }
  }

  const newAddedPosition = findExpandedPositionForFocus()
  if (!prevPositions.includes(newAddedPosition)) {
    unusedPositions.push(newAddedPosition)
  }

  return prevPositions.map((prevPosition) => {
    if (
      isPositionOutOfBounds(prevPosition) &&
      prevPosition !== newAddedPosition
    ) {
      return unusedPositions.pop() as number
    }

    return prevPosition
  })
}
