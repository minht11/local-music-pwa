import {
  LitElement,
  html,
  css,
  customElement,
  property,
  PropertyValues,
} from 'lit-element'
import { render } from 'lit-html'
import bind from 'bind-decorator'
// For some reasons eslint can't find resize-observer-browser.
// eslint-disable-next-line
import { ResizeObserver, ResizeObserverEntry } from 'resize-observer-browser'
import { isResizeObserverSupported } from '../lib/supported'
import { listItemStyles } from './shared-styles'


// TODO. Investigate possibility of replacing this with more robust solution.
// Several possible options are:
// Vaadin virtual scroller, not using it right
// now because of it's reliance on polymer 3.
// Try proposed built in virtual-scroller element
// when it comes out.


// TODO. More work and cleaning up
// around resizing behavior is needed.

// NPM package doesnt include types.
// https://github.com/hyperdivision/debounce-raf
function rafDebounce(fn: Function) {
  let queued: number | undefined
  return (...args: unknown[]) => {
    if (queued) {
      cancelAnimationFrame(queued)
    }

    queued = requestAnimationFrame(fn.bind(fn, ...args))
  }
}

@customElement('virtual-list')
export class VirtualList extends LitElement {
  @property()
  scroller?: HTMLElement = this

  @property()
  items: unknown[] = []

  // Function returning lit-html template
  // or HTML element.
  @property()
  template?: Function

  // Private properties change to #property syntax
  // when ts starts to support it.
  itemHeight: number = -1

  // Scroller height.
  scrollerHeight: number = 0

  scrollerTop: number = 0

  paddingAdjustedTop: number = 0

  itemsContainerTop: number = 0

  previousScrollPos: number = 0

  // Item count in top and bottom which
  // are added to visible items count.
  preRenderedItemsCount: number = 4

  // visibleItemsCount + 2 * preRenderedItemsCount
  totalItemsCount: number = 0

  // Virtual items DOM references
  itemsElements: HTMLElement[] = []

  // Virtual items positions
  itemsPositions: number[] = []

  pause: boolean = false

  scrollerRO?: ResizeObserver

  // Used when browser does not support
  // resize observer to get event when
  // scroller is made visible.
  scrollerIO!: IntersectionObserver

  get activeScroller() {
    return this.scroller ? this.scroller : this
  }

  // listItemStyles temporally solution for styling
  // until measure element is rendered in light DOM.
  static styles = [
    listItemStyles,
    css`
    :host {
      display: block;
      overflow-anchor: none;
      overflow: auto;
    }
    #items-container {
      display: flex;
      flex-direction: column;
      position: relative;
    }
    #item-size-measure {
      position: absolute;
      visibility: hidden;
    }
    ::slotted(.item) {
      contain: content;
      width: 100%;
      box-sizing: border-box;
      position: absolute;
      top: 0;
    }`,
  ]

  render() {
    const itemSizeElement = this.template && this.items.length > 0
      ? this.template(this.items[0], 0) : html``
    return html`
      <div id='item-size-measure'>${itemSizeElement}</div>
      <div id='items-container'>
        <slot name='virtual-item'></slot>
      </div>
    `
  }

  async firstUpdated() {
    this.onScrollHandle = rafDebounce(this.onScrollHandle)
    if (isResizeObserverSupported) {
      this.scrollerRO = new window.ResizeObserver(entries => entries.forEach(this.onResizeHandle))
      this.scrollerRO.observe(this.activeScroller)
    } else {
      this.scrollerIO = new IntersectionObserver((entries) => {
        entries.filter(entry => entry.isIntersecting).forEach(() => {
          this.onResizeHandle()
        })
      })
      window.addEventListener('resize', this.onResizeHandle)
      await this.updateComplete
    }
  }

  @bind
  onResizeHandle(entry?: ResizeObserverEntry | Event) {
    if (this.items.length <= 0 && this.itemHeight === 0) {
      return
    }
    if (isResizeObserverSupported) {
      const { height, top } = (entry as ResizeObserverEntry).contentRect
      this.scrollerHeight = height
      this.scrollerTop = top
      this.setupScroller()
    } else {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const { height, top } = this.activeScroller.getBoundingClientRect()
        this.scrollerHeight = height
        this.scrollerTop = top
        this.setupScroller()
      }))
    }
  }

  async updated(changedProperties: PropertyValues) {
    if (changedProperties.has('scroller')) {
      const oldScrollerElement = changedProperties.get('scroller') as HTMLElement | undefined

      await this.updateComplete
      if (oldScrollerElement && oldScrollerElement !== this.scroller) {
        oldScrollerElement.removeEventListener('scroll', this.onScrollHandle)
        if (this.scrollerRO) {
          this.scrollerRO.unobserve(oldScrollerElement)
        } else {
          this.scrollerIO.unobserve(oldScrollerElement)
        }
      } else {
        if (this.scrollerRO) {
          this.scrollerRO.observe(this.activeScroller)
        } else {
          this.scrollerIO.observe(this.activeScroller)
          this.onResizeHandle()
        }
        this.activeScroller.addEventListener('scroll', this.onScrollHandle)
        this.setupScroller()
      }
    } else if (changedProperties.has('items')) {
      this.setupScroller()
    } else if (changedProperties.has('template')) {
      this.updateAllElements()
    }
  }

  async setupScroller() {
    await this.updateComplete
    const itemElement = this.renderRoot.querySelector('#item-size-measure') as HTMLElement
    this.itemHeight = itemElement.offsetHeight

    const itemsContainer = this.renderRoot.querySelector('#items-container') as HTMLElement
    this.itemsContainerTop = itemsContainer.offsetTop

    this.paddingAdjustedTop = this.itemsContainerTop - this.scrollerTop
    itemsContainer.style.height = `${this.items.length * this.itemHeight}px`
    const visibleItemsCount = Math.ceil(this.scrollerHeight / this.itemHeight)
    this.totalItemsCount = Math.min(
      visibleItemsCount + this.preRenderedItemsCount * 2,
      this.items.length,
    )
    if (Number.isNaN(this.totalItemsCount)) {
      this.totalItemsCount = 0
    }
    this.createElements()
    this.updateItemsPositions()
    this.updateAllElements()
  }

  createElements() {
    this.itemsPositions = Array.from(
      { length: this.totalItemsCount },
      (_, index) => index,
    )

    this.itemsElements = this.itemsPositions.map(() => {
      const element = document.createElement('div')
      element.classList.add('item')
      element.slot = 'virtual-item'
      return element
    })
    const template = html`${this.itemsElements.map(element => html`${element}`)}`
    render(template, this)
  }

  updateItemsPositions() {
    const newScrollPos = this.getScrollPosition()
    this.previousScrollPos = newScrollPos
    this.itemsPositions = this.itemsPositions.map((_, index) => newScrollPos + index)
  }

  updateElement(position: number, index: number) {
    const element = this.itemsElements[index]
    element.style.transform = `translateY(${position * this.itemHeight}px)`
    if (this.template) {
      render(this.template(this.items[position], position), element)
    }
  }

  updateAllElements() {
    this.itemsPositions.forEach((position, index) => this.updateElement(position, index))
  }

  getScrollPosition() {
    const scrollTop = this.activeScroller.scrollTop - this.paddingAdjustedTop
    const scrollPosition = Math.floor(scrollTop / this.itemHeight)
    const scrollPositionAdjusted = scrollPosition - this.preRenderedItemsCount
    const maxScrollPosition = this.items.length - this.totalItemsCount
    return Math.max(0, Math.min(scrollPositionAdjusted, maxScrollPosition))
  }

  @bind
  onScrollHandle() {
    if (this.totalItemsCount >= this.items.length || this.pause) {
      return
    }
    const newScrollPos = this.getScrollPosition()
    if (this.previousScrollPos === newScrollPos) {
      return
    }

    // In order not to leave any spaces if scroll poistion changes
    // rapidly more than one value, calculate the difference.
    let difference = Math.abs(this.previousScrollPos - newScrollPos)
    difference = Math.min(difference, this.totalItemsCount) - 1

    const lastItemRange = Math.min(
      newScrollPos + this.totalItemsCount,
      this.items.length,
    ) - 1

    this.previousScrollPos = newScrollPos

    // Offset of how many items needs to be changed.
    let offset = 0
    this.itemsPositions.forEach((value, index) => {
      const isOutOfRangeUpwards = newScrollPos > value
      const isOutOfRangeDownwards = lastItemRange < value

      if (isOutOfRangeUpwards || isOutOfRangeDownwards) {
        let itemPosition = -1
        if (isOutOfRangeUpwards) {
          itemPosition = lastItemRange + offset - difference
        } else {
          itemPosition = newScrollPos - offset + difference
        }
        if (itemPosition > -1) {
          offset += 1
          if (difference > 0) {
            difference -= 0
          }

          this.itemsPositions[index] = itemPosition
          this.updateElement(itemPosition, index)
        }
      }
    })
  }
}
