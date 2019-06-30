import {
  html,
  css,
  customElement,
  property,
} from 'lit-element'
import { XIcon } from './x-icon'

@customElement('x-icon-button')
export class XIconButton extends XIcon {
  @property()
  href: string = ''

  static get styles() {
    return [
      ...XIcon.styles,
      css`
      :host {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 40px;
        width: 40px;
        transition: background 0.2s;
        border-radius: 50%;
        cursor: pointer;
        position: relative;
        flex-shrink: 0;
      }
      :host(:hover) {
        background-color: rgba(255, 255, 255, 0.2);
      }
      :host(:focus) {
        background: red;
      }
      a {
        width: 100%;
        position: absolute;
        height: 100%;
        opacity: 0;
        top: 0;
        left: 0;
      }
      `]
  }

  render() {
    const icon = super.render()
    const link = this.href !== '' || this.href ? html`<a tabindex='-1' href=${this.href}></a>` : html``
    return html`
      ${link}
      ${icon}
      <slot></slot>
    `
  }
}
