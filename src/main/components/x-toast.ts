import {
  LitElement,
  html,
  css,
  customElement,
  property,
  PropertyValues,
} from 'lit-element'
import { buttonStyles } from './shared-styles'
import { ANIMATION_CURVES } from '../utils/animation-curves'
import { isWebAnimationsSupported } from '../lib/supported'

export interface ToastData {
  id: string,
  title: string,
  spinner?: boolean,
  button?: {
    title: string,
    close?: boolean,
    handler?: Function,
  } | boolean,
  duration?: number,
}

@customElement('x-toast')
export class XToast extends LitElement {
  @property()
  animationEnabled: boolean = true

  @property()
  data!: ToastData

  closeInterval?: number

  static get styles() {
    return [
      buttonStyles,
      css`
      :host {
        display: flex;
        flex-wrap: wrap;
        width: 100%;
        min-height: 48px;
        margin: 16px 0;
        border-radius: 8px;
        line-height: 16px;
        padding: 8px 8px 8px 16px;
        box-sizing: border-box;
        align-items: center;
        justify-content: flex-end;
        background: var(--app-surface-3-color);
        box-shadow: 0 3px 5px -1px rgba(0,0,0,.2);
        pointer-events: all;
        will-change: transform, opacity;
        --x-toast-accent-color: lightblue;
      }
      .title {
        margin-right: auto;
        font-size: 14px;
        padding: 8px 0;
      }
      .spinner {
        background: red;
      }
      button {
        color: var(--x-toast-accent-color);
      }
    `]
  }

  render() {
    const buttonTemplate = this.data.button
      ? html`
      <button @click=${this.buttonOnClickHandler}>
        ${typeof this.data.button !== 'boolean' ? this.data.button.title : 'Dismiss'}
      </button>` : html``

    const spinnerTemplate = this.data.spinner
      ? html`<div class='spinner'>spinner</div>` : html``
    return html`
    <div class='title'>${this.data.title}</div>
    ${spinnerTemplate}
    ${buttonTemplate}
    `
  }

  firstUpdated() {
    if (this.animationEnabled && isWebAnimationsSupported) {
      const sharedTiming: AnimationEffectTiming = {
        duration: 250,
        easing: ANIMATION_CURVES.decelerationCurve,
        fill: 'both',
      }

      this.animate({
        transform: ['translateY(100%)', 'none'],
        opacity: [0, 1],
      }, sharedTiming)
    }
  }

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('data')) {
      if ('duration' in this.data) {
        clearInterval(this.closeInterval)
        this.closeInterval = setTimeout(() => this.dispatchCloseEvent(), this.data.duration)
      }
    }
  }

  buttonOnClickHandler() {
    if (typeof this.data.button === 'boolean') {
      this.dispatchCloseEvent()
    } else if (this.data.button && this.data.button.handler) {
      this.data.button.handler()
      if (this.data.button.close) {
        this.dispatchCloseEvent()
      }
    } else {
      this.dispatchCloseEvent()
    }
  }

  dispatchCloseEvent() {
    if (this.animationEnabled && isWebAnimationsSupported) {
      const sharedTiming: AnimationEffectTiming = {
        duration: 100,
        easing: ANIMATION_CURVES.accelerationCurve,
        fill: 'both',
      }

      this.animate({
        transform: ['none', 'translateY(100%)'],
        opacity: [1, 0],
      }, sharedTiming).onfinish = () => {
        this.dispatchEvent(new Event('dismiss'))
      }
    } else {
      this.dispatchEvent(new Event('dismiss'))
    }
  }
}
