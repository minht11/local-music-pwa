import {
  createMemo,
  Index,
  Show,
  createComputed,
  Component,
  children,
} from 'solid-js'
import { createStore } from 'solid-js/store'
import { Dynamic } from 'solid-js/web'
import {
  clickFocusedElement,
  createArray,
  doesElementContainFocus,
} from '../../../utils'
import { KeyboardCode } from '../../../utils/key-codes'
import { VirtualListProps } from './types'
import {
  LayoutMeasurements,
  createMeasurements,
} from './helpers/create-measurements'
import {
  getIntegerOrZero,
  createMainAxisPositions,
} from './helpers/create-main-axis-positions'
import * as styles from './virtual-container.css'

interface VirtualItemsContainer<T> extends VirtualListProps<T> {
  crossAxisCount?: (
    measurements: LayoutMeasurements,
    itemsCount: number,
  ) => number
}

export interface VirtualState {
  focusPosition: number
  mainAxis: {
    // TODO: Rename total to lastPosition or something
    // similar to make it more clear what it represents.
    // Maximum position count.
    total: number
    // Focused position for this axis.
    focusPosition: number
    scrollValue: number
  }
  crossAxis: {
    total: number
  }
}

export function VirtualContainer<T>(props: VirtualItemsContainer<T>) {
  const [state, setState] = createStore<VirtualState>({
    focusPosition: 0,
    mainAxis: {
      total: 0,
      focusPosition: 0,
      scrollValue: 0,
    },
    crossAxis: {
      total: 0,
    },
  })

  const {
    containerEl,
    setContainerRefEl,
    isDirectionHorizontal,
    measurements,
  } = createMeasurements(props)

  const itemsCount = () => props.items?.length || 0

  createComputed(() => {
    if (!measurements.isMeasured) {
      return
    }

    const cTotal = getIntegerOrZero(
      // There are always gonna be at least one column.
      props.crossAxisCount?.(measurements, itemsCount()) || 1,
    )

    setState('crossAxis', {
      total: cTotal,
    })
  })

  createComputed(() => {
    if (!measurements.isMeasured) {
      return
    }

    const iCount = itemsCount()
    const cTotal = state.crossAxis.total

    const mTotal = Math.ceil(iCount / cTotal)

    setState('mainAxis', {
      total: getIntegerOrZero(mTotal),
    })
    setState('crossAxis', {
      total: cTotal,
      positions: createArray(0, state.crossAxis.total),
    })
  })

  createComputed(() => {
    const mFocusPos = Math.floor(state.focusPosition / state.crossAxis.total)
    setState('mainAxis', 'focusPosition', getIntegerOrZero(mFocusPos))
  })

  const mainAxisPositions = createMainAxisPositions(
    measurements,
    state.mainAxis,
  )

  const containerStyleProps = () => {
    const containerSize = state.mainAxis.total * measurements.itemSize.main
    const property = isDirectionHorizontal() ? 'width' : 'height'

    return {
      [property]: `${containerSize}px`,
    }
  }

  const getItemStyle = (mainPos: number, crossPos = 0) => {
    const size = measurements.itemSize

    const mainSize = size.main * mainPos
    const crossSize = size.cross * crossPos

    let xTranslate = crossSize
    let yTranslate = mainSize
    let width = size.cross
    let height = size.main

    if (isDirectionHorizontal()) {
      xTranslate = mainSize
      yTranslate = crossSize
      width = size.main
      height = size.cross
    }

    return {
      transform: `translate(${xTranslate}px, ${yTranslate}px)`,
      width: width ? `${width}px` : '',
      height: height ? `${height}px` : '',
    }
  }

  const crossAxisPositions = createMemo(() =>
    createArray(0, state.crossAxis.total),
  )

  // When items change, old positions haven't yet changed, so if lengths of
  // these 2 arrays don't match, there will be errors.
  // This memo delays resolving items until new positions are calculated.
  const items = createMemo(() => props.items || [])

  const calculatePosition = (m: number, c: number) =>
    m * state.crossAxis.total + c

  const MainAxisItems: Component<{ crossPos?: number }> = (itemProps) => (
    <Index each={mainAxisPositions()}>
      {(mainPos) => {
        const index = createMemo(() => {
          const mPos = mainPos()
          const cPos = itemProps.crossPos
          if (cPos === undefined) {
            return mPos
          }

          return calculatePosition(mPos, cPos)
        })

        return (
          <Show when={index() < items().length}>
            <Dynamic
              component={props.children}
              items={items()}
              item={items()[index()]}
              index={index()}
              tabIndex={index() === state.focusPosition ? 0 : -1}
              style={getItemStyle(mainPos(), itemProps.crossPos)}
            />
          </Show>
        )
      }}
    </Index>
  )

  const virtualElements = children(() => (
    // If there less than 2 cross axis columns
    // use fast path with only one loop, instead of 2.
    <Show when={state.crossAxis.total > 1} fallback={<MainAxisItems />}>
      <Index each={crossAxisPositions()}>
        {(crossPos) => <MainAxisItems crossPos={crossPos()} />}
      </Index>
    </Show>
  )) as () => (HTMLElement | undefined)[]

  const findFocusPosition = () => {
    const cPositions = crossAxisPositions()
    const mPositions = mainAxisPositions()
    const elements = virtualElements()

    const focusedElementIndex = elements.findIndex((element) =>
      // inside grid last few elements can be undefined,
      // so safeguard for undefined.
      element?.matches(':focus-within,:focus'),
    )

    if (focusedElementIndex === -1) {
      return -1
    }

    if (state.crossAxis.total > 1) {
      const cIndex = Math.floor(focusedElementIndex / mPositions.length)
      const mIndex = focusedElementIndex % mPositions.length

      const cPos = cPositions[cIndex]
      const mPos = mPositions[mIndex]

      const focusPosition = calculatePosition(mPos, cPos)

      return focusPosition
    }

    // If grid is one dimenisonal (i.e. just list) index
    // maps directly to position.
    return mPositions[focusedElementIndex]
  }

  const moveFocusHandle = (increment: number, isMainDirection: boolean) => {
    const fPosition = state.focusPosition

    let cPos = fPosition % state.crossAxis.total
    let mPos = Math.floor(fPosition / state.crossAxis.total)

    if (isMainDirection) {
      mPos += increment
    } else {
      cPos += increment
    }

    const newFocusPos = calculatePosition(mPos, cPos)

    // Prevent focus position from going out of list bounds.
    if (newFocusPos < 0 || newFocusPos >= itemsCount()) {
      return
    }

    const cIndex = crossAxisPositions().indexOf(cPos)

    if (cIndex === -1) {
      return
    }

    setState('focusPosition', newFocusPos)

    // After focusPosition is set elements and positions might have changed.
    const elements = virtualElements()

    const mPositions = mainAxisPositions()
    const mIndex = mPositions.indexOf(mPos)

    if (mIndex === -1) {
      return
    }

    const newIndex = cIndex * mPositions.length + mIndex
    const foundEl = elements[newIndex]

    if (!foundEl) {
      return
    }

    queueMicrotask(() => {
      foundEl.focus()
      foundEl.scrollIntoView({ block: 'nearest' })
    })
  }

  const onKeydownHandle = (e: KeyboardEvent) => {
    const { code } = e

    const isArrowUp = code === KeyboardCode.ARROW_UP
    const isArrowDown = code === KeyboardCode.ARROW_DOWN
    const isArrowLeft = code === KeyboardCode.ARROW_LEFT
    const isArrowRight = code === KeyboardCode.ARROW_RIGHT

    const isArrowUpOrDown = isArrowUp || isArrowDown
    const isArrowDownOrRight = isArrowDown || isArrowRight

    if (isArrowDownOrRight || isArrowUp || isArrowLeft) {
      moveFocusHandle(isArrowDownOrRight ? 1 : -1, isArrowUpOrDown)
    } else if (code === KeyboardCode.ENTER) {
      if (!clickFocusedElement(containerEl())) {
        return
      }
    } else {
      return
    }

    e.preventDefault()
  }

  const onFocusInHandle = () => {
    // Restore previous focus position. For example user switching tab
    // back and forth.
    const newFocusPosition = findFocusPosition()
    setState('focusPosition', newFocusPosition === -1 ? 0 : newFocusPosition)
  }

  const onFocusOutHandle = async () => {
    queueMicrotask(() => {
      if (!doesElementContainFocus(containerEl())) {
        setState('focusPosition', 0)
      }
    })
  }

  return (
    <div
      ref={setContainerRefEl}
      className={styles.container}
      style={containerStyleProps()}
      onKeyDown={onKeydownHandle}
      onFocusIn={onFocusInHandle}
      onFocusOut={onFocusOutHandle}
      role='list'
    >
      {virtualElements()}
    </div>
  )
}
