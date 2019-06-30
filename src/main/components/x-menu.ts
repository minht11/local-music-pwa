import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
  PropertyValues,
} from 'lit-element'
import { bind } from 'bind-decorator'
import { ANIMATION_CURVES } from '../utils/animation-curves'

export interface MenuItem {
  name: string,
  fn: Function,
  items?: MenuItem,
}

export interface MenuPosition {
  x: number,
  y: number,
}

@customElement('x-menu')
export class XMenu extends LitElement {
  @query('.content')
  contentElement!: HTMLElement

  @property()
  position?: MenuPosition

  @property()
  items: MenuItem[] = []

  focusOutTimeout: number = 0

  static styles = css`
    :host {
      --menu-origin: right top;
      display: none;
      position: fixed;
      width: 200px;
      border-radius: 8px;
      will-change: transform;
      transform-origin: var(--menu-origin);
      overflow: hidden;
      background: var(--app-surface-2-color);
      display: flex;
      box-shadow: 0 4px 10px 0px rgba(0, 0, 0, 0.2);
    }
    .content {
      opacity: 0;
      width: 100%;
      padding: 8px 0;
      outline: none;
    }
    list-item {
      display: flex;
      align-items: center;
      height: 40px;
      padding: 0 24px;
      font-size: 14px;
      outline: none;
      transition: background-color 0.2s;
    }
    list-item:hover {
      background-color: rgba(255, 255, 255, 0.1);
      cursor: pointer;
    }
    list-item:focus {
      padding: 0 22px;
      border: 2px solid blue;
      box-sizing: border-box;
    }`

  render() {
    const menuItemsTemplate = this.items ? this.items.map(item => html`
        <list-item
            tabindex='1'
            @click=${() => { this.dispatchCloseEvent(); item.fn() }}>
          ${item.name}
        </list-item>`)
      : html``

    return html`
      <div class='content' tabindex='-1'>
        ${menuItemsTemplate}
      </div>
    `
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('position')) {
      this.positionMenu(this.position)
      this.animateMenu()
      this.contentElement.focus({ preventScroll: true })
    }
  }

  firstUpdated() {
    this.animateMenu()
  }

  connectedCallback() {
    super.connectedCallback()
    document.addEventListener('focusout', this.onFocusOutHandler)
    // document.addEventListener('focusin', () => console.log('focusin'))
    window.addEventListener('blur', this.dispatchCloseEvent)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    window.removeEventListener('focusout', this.onFocusOutHandler)
    window.removeEventListener('blur', this.dispatchCloseEvent)
  }

  @bind
  onFocusOutHandler() {
    clearTimeout(this.focusOutTimeout)
    this.focusOutTimeout = window.setTimeout(() => {
      const shadowRoot = (this.shadowRoot as ShadowRoot)
      if (!shadowRoot.contains(shadowRoot.activeElement)) {
        this.dispatchCloseEvent()
      }
    }, 100)
  }

  positionMenu(position?: MenuPosition) {
    if (!this.items || !position) return
    const width = 200
    const itemSize = 40
    const verticalPadding = 16
    const height = itemSize * this.items.length + verticalPadding
    const wH = window.innerHeight
    const wW = window.innerWidth
    const { x, y } = position

    let yOrigin = 'top'
    let xOrigin = 'left'
    let top = `${y}px`
    let left = `${x}px`

    if (y + height > wH) {
      yOrigin = `${height - (wH - y)}px`
      top = `${wH - height}px`
    }
    if (x < width) {
      xOrigin = `${x}px`
      left = '0px'
    }
    if (x + width > wW) {
      xOrigin = `${width - (wW - x)}px`
      left = `${wW - width}px`
    }
    requestAnimationFrame(() => {
      this.style.top = top
      this.style.left = left
      this.style.width = `${width}px`
      this.style.setProperty('--menu-origin', `${xOrigin} ${yOrigin}`)
      this.contentElement.focus({ preventScroll: true })
    })
  }

  animateMenu() {
    this.contentElement.style.opacity = '0'
    const sharedTiming: AnimationEffectTiming = {
      duration: 160,
      easing: ANIMATION_CURVES.decelerationCurve,
      fill: 'backwards',
    }
    this.animate({
      transform: ['scale(0, 0)', 'none'],
    }, sharedTiming).onfinish = () => {
      this.contentElement.animate({
        opacity: [0, 1],
      }, sharedTiming)
      this.contentElement.style.opacity = '1'
    }
  }

  @bind
  dispatchCloseEvent() {
    this.dispatchEvent(new Event('close'))
  }
}
