import {
  LitElement,
  html,
  css,
  customElement,
  property,
  PropertyValues,
  query,
  CSSResult,
} from 'lit-element'
import { render, TemplateResult } from 'lit-html'
import { isHTMLDialogElementSupported } from '../lib/supported'
import { headingStyles, buttonStyles } from './shared-styles'

const dialogStyles = [
  headingStyles,
  buttonStyles,
  css`
  #dialog {
    display: flex;
    flex-direction: column;
    position: absolute;
    height: 100%;
    width: 100%;
    max-width: 400px;
    max-height: 500px;
    background: var(--app-surface-2-color);
    border-radius: 8px;
    padding: 0;
    margin: auto;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    z-index: 1;
    border: none;
    height: fit-content;
  }
  #dialog::backdrop,
  #backdrop {
    background-color: rgba(0,0,0,.2);
  }
  #backdrop {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
  }
  h1 {
    font-size: 24px;
    margin: 16px auto;
  }
  .dialog-bottom-bar {
    height: 48px;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0 8px;
    box-sizing: border-box;
    border-top: 1px solid var(--app-divider-color);
    margin: auto 0 0;
    flex-shrink: 0;
  }
  .dialog-bottom-bar button {
    margin-left: 8px;
  }
  `]

@customElement('x-dialog-polyfill')
export class XDialogPolyfill extends LitElement {
  @property()
  template?: TemplateResult

  @property()
  styles?: CSSResult

  static styles = [
    ...dialogStyles,
  ]

  render() {
    return html`
      <style>${this.styles}</style>
      <div id='dialog'>
        ${this.template}
      </div>
      <div id='backdrop'></div>
    `
  }
}

@customElement('x-dialog')
export class XDialog extends LitElement {
  @query('dialog')
  dialogRealElement!: HTMLDialogElement

  dialogPolyfill!: XDialogPolyfill

  @property()
  open: boolean = false

  @property()
  template?: TemplateResult

  @property()
  styles?: CSSResult

  async getDialogElement() {
    await this.updateComplete
    if (isHTMLDialogElementSupported) {
      return this.dialogRealElement
    }
    await this.dialogPolyfill.updateComplete
    return this.dialogPolyfill.renderRoot.querySelector('#dialog') as HTMLElement
  }

  static styles = [
    ...dialogStyles,
    css`
    :host {
      display: block;
    }
    #dialog[hidden] {
      display: none;
    }
    `]

  render() {
    return this.open && isHTMLDialogElementSupported
      ? html`
      <style>${this.styles}</style>
      <dialog id='dialog' ?hidden=${!isHTMLDialogElementSupported}>${isHTMLDialogElementSupported ? this.template : ''}</dialog>
    ` : html``
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('open')) {
      if (this.open) {
        if (isHTMLDialogElementSupported) {
          this.dialogRealElement.showModal()
        } else {
          this.dialogPolyfill = new XDialogPolyfill()
          document.body.appendChild(this.dialogPolyfill)
        }
      } else {
        const preveousOpenState = changedProperties.get('open')
        if (preveousOpenState) {
          if (isHTMLDialogElementSupported) {
            // this.dialogRealElement.close()
          } else {
            document.body.removeChild(this.dialogPolyfill)
          }
        }
      }
    }
    if (changedProperties.has('template')) {
      if (!isHTMLDialogElementSupported && this.open) {
        this.dialogPolyfill.template = this.template
        this.dialogPolyfill.styles = this.styles
      } else {
        render(this.template || html``, this)
      }
    }
  }

  openDialog() {
    this.open = true
  }

  closeDialog() {
    this.open = false
  }
}
