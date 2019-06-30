import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
} from 'lit-element'
import bind from 'bind-decorator'
import { ANIMATION_CURVES } from '../utils/animation-curves'
import { listItemStyles } from './shared-styles'

import './x-icon'
// eslint-disable-next-line
import './x-dialog'
// eslint-disable-next-line
import { XDialog } from './x-dialog'

@customElement('x-select')
export class XSelect extends LitElement {
  @query('#drop-down')
  dropDownElement!: HTMLElement

  @query('#popup')
  popupElement!: XDialog

  @property({ reflect: true })
  label?: string

  @property()
  items: unknown[] = []

  @property()
  selected?: number

  @property()
  open: boolean = false

  @property()
  visible: boolean = false

  identifier: number | string = 0

  get selectedItem() {
    return this.selected !== undefined
      ? this.items[this.selected]
      : ''
  }

  static styles = css`
    :host {
      width: 100px;
      display: block;
      color: var(--app-primary-text-color);
      font-size: 14px;
    }
    :host([label]) #drop-down {
      padding: 5px 4px 5px 16px;
      grid-template-rows: 14px 24px;
      grid-template-areas: 'label label' 'text icon';
    }
    :host #drop-down:hover {
      background: var(--app-surface-2-color);
    }
    #drop-down {
      display: grid;
      grid-template-rows: 24px;
      grid-template-columns: 1fr 24px;
      grid-template-areas: 'text icon';
      grid-column-gap: 4px;
      justify-content: center;
      align-items: center;
      transition: background .2s;
      border-radius: 8px;
      padding: 8px 4px 8px 16px;
      box-sizing: border-box;
      background: var(--app-surface-2-color);
      cursor: pointer;
    }
    .label {
      grid-area: label;
      font-size: 12px;
      color: var(--app-primary-text-color);
      align-self: end;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }`

  static popupStyles = [
    listItemStyles,
    css`
    #dialog {
      width: 200px;
      right: initial !important;
      bottom: initial !important;
      margin: initial !important;
      height: auto !important;
      max-height: 228px !important;
      outline: none;
      user-select: none;
      border-radius: 8px;
      overflow: hidden;
      background: var(--app-surface-2-color) !important;
      transform-origin: right top 0px;
      will-change: transform;
      box-shadow: 0 4px 10px 0px rgba(0, 0, 0, 0.2);
      border: none;
      padding: 0;
    }
    #backdrop,
    #dialog::backdrop {
      background: transparent !important;
    }
    #popup-content {
      display: block;
      padding: 8px 0;
      overflow: overlay;
      z-index: 1;
      position: relative;
      box-sizing: border-box;
      max-height: inherit;
      opacity: 0;
      will-change: transform;
      transition: opacity .2s;
    }
    #popup-content[visible] {
      opacity: 1;
    }`,
  ]

  render() {
    const popupTemplate = this.open ? html`
      <ul
          id='popup-content'
          .selected=${this.selected}
          ?visible=${this.visible}>
        ${this.items.map((name, index) => html`
          <li
              class='item'
              tabindex='0'
              ?selected=${this.selected === index}
              @click=${() => this.select(index)}>
            ${name}
          </li>`)}
      </ul>` : html``

    return html`
    <div id='drop-down' @click=${this.openPopup}>
      <div class='label'>${this.label}</div>
      <div class='text'>${this.selectedItem}</div>
      <x-icon .icon=${'menuDown'} class='drop-down-icon'></x-icon>
    </div>

    <x-dialog
        id='popup'
        .styles=${XSelect.popupStyles}
        .template=${popupTemplate}>
    </x-dialog>
    `
  }

  async openPopup() {
    if (this.open) return
    this.open = true
    await this.updateComplete
    const rect = this.dropDownElement.getBoundingClientRect()

    const padding = 8
    const itemSize = 40
    const height = Math.min(this.items.length, 5) * itemSize + padding * 2

    const scaleY = rect.height / height

    let selected = this.selected === undefined ? 0 : this.selected

    this.popupElement.openDialog()
    const dialog = await this.popupElement.getDialogElement()
    document.addEventListener('click', this.handlePopupCloseClick)

    if (this.items.length > 5 && selected >= 3) {
      const contentElement = dialog.querySelector('popup-content') as HTMLElement
      contentElement.scrollTop = (selected - 2) * itemSize

      // Always make selected item appear at center and set
      // scroll position accordingly ie at position 2.
      // If selected item is last or almost last set it's position as
      // 4 and 3 respectively.
      selected = Math.max(2, 4 - (this.items.length - 1 - selected))
    }

    let translateValue
    let topValue
    // Position popup on top of the select element
    // or if window size is too small at window top
    const expectedTopPosition = rect.top - itemSize * selected - padding
    if (rect.top < expectedTopPosition || expectedTopPosition < 0) {
      topValue = 0
      translateValue = rect.top
    } else if (expectedTopPosition + height + itemSize > window.innerHeight) {
      topValue = window.innerHeight - height
      translateValue = rect.top - topValue
    } else {
      topValue = expectedTopPosition
      translateValue = selected * itemSize + padding
    }

    dialog.style.top = `${topValue}px`
    dialog.style.left = `${rect.left}px`
    dialog.style.width = `${rect.width}px`

    const translate = `translateY(${translateValue}px)`
    const scale = `scaleY(${scaleY})`
    dialog.animate({
      transform: [`${translate} ${scale}`, 'none'],
    }, {
      duration: 180,
      easing: ANIMATION_CURVES.decelerationCurve,
      fill: 'both',
    }).onfinish = () => {
      this.visible = true
    }
  }

  @bind
  async handlePopupCloseClick(e?: Event) {
    const dialog = await this.popupElement.getDialogElement()
    if (e === undefined || !('composedPath' in e) || e.composedPath()[0] === dialog) {
      dialog.animate({
        opacity: [1, 0],
      }, {
        duration: 180,
        easing: ANIMATION_CURVES.accelerationCurve,
        fill: 'both',
      }).onfinish = () => {
        this.popupElement.closeDialog()
        this.open = false
        this.visible = false
      }
    }
  }

  select(selected: number) {
    this.selected = selected
    this.dispatchEvent(new CustomEvent('input', { detail: this.selected }))
    this.handlePopupCloseClick()
  }
}
