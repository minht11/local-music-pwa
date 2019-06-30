import {
  LitElement,
  html,
  css,
  customElement,
  property,
} from 'lit-element'

@customElement('x-switch')
export class XSwitch extends LitElement {
  @property({ reflect: true, type: Boolean })
  checked: boolean = false

  static get styles() {
    return [css`
    :host {
      display: block;
      position: relative;
      cursor: pointer;
    }
    :host([checked]) #thumb {
      transform: translateX(16px);
      background-color: var(--app-accent-color);
    }
    #thumb {
      width: 20px;
      height: 20px;
      border-radius: 20px;
      margin-top: -2px;
      background: var(--app-surface-3-color);
      transition: background .2s, transform .2s;
      position: absolute;
    }
    :host([checked]) #track {
      background-color: var(--app-accent-color);
      opacity: .4;
    }
    #track {
      height: 16px;
      width: 36px;
      border-radius: 20px;
      background: var(--app-divider-color);
      transition: background .2s, opacity .2s;
    }
    `]
  }

  render() {
    return html`
      <div id='thumb'></div>
      <div id='track'></div>
    `
  }

  firstUpdated() {
    this.addEventListener('click', () => {
      this.checked = !this.checked
      this.dispatchEvent(new CustomEvent('input', { detail: this.checked }))
    })
  }
}
