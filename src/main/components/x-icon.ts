import {
  LitElement,
  html,
  css,
  svg,
  customElement,
  property,
  PropertyValues,
} from 'lit-element'
import { ICON_PATHS, IconType } from '../../shared/x-icon-paths'
import { isPaintWorkletSupported } from '../lib/supported'

if (isPaintWorkletSupported) {
  CSS.paintWorklet.addModule('/x-icon-worklet.js')
}

@customElement('x-icon')
export class XIcon extends LitElement {
  @property()
  icon?: IconType

  static get styles() {
    return [
      css`
      :host {
        display: block;
        height: 24px;
        width: 24px;
        contain: strict;
        position: relative;
      }
      #icon {
        height: 24px;
        width: 24px;
        background: paint(x-icon-painter);
        fill: var(--x-icon-color);
        pointer-events: none;
      }
      `,
    ]
  }

  render() {
    if (this.icon) {
      const icon = isPaintWorkletSupported
        ? html`<div id='icon' ?hidden=${!this.icon}></div>`
        : svg`<svg id='icon'><path d=${ICON_PATHS[this.icon]}/></svg>`
      return icon
    }
    return html``
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('icon') && this.icon) {
      this.style.setProperty('--x-icon', this.icon)
    }
  }
}
