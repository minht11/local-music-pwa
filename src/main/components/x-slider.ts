import {
  LitElement,
  html,
  css,
  customElement,
  property,
  query,
} from 'lit-element'
import './x-icon'

const isResizeObserverSupported = 'ResizeObserver' in window

@customElement('x-slider')
export class XSlider extends LitElement {
  @query('#slider-input')
  sliderInputElement!: HTMLInputElement

  @query('#progress')
  progressElement!: HTMLDivElement

  @property()
  min: number = 0

  @property()
  max: number = 100

  @property()
  value: number = 0

  @property()
  seekingValue: number = 0

  @property()
  trackWidth: number = 0

  @property()
  seeking: boolean = false

  get actualValue() {
    return this.seeking ? this.seekingValue : this.value
  }

  static get styles() {
    return [css`
    :host {
      display: block;
      width: 200px;
      position: relative;c
      contain: strict;
      --x-slider-track-size: 4px;
      --x-slider-thumb-height: 16px;
      --x-slider-thumb-width: 16px;
      --x-slider-thumb-radius: 50%;
      --x-slider-track-color: var(--app-divider-color);
      --x-slider-progress-color: var(--app-accent-color);
      --x-slider-thumb-color: var(--app-accent-color);
    }
    .container {
      overflow: hidden;
      height: 100%;
      display: flex;
      align-items: center;
      position: relative;
    }
    .bar {
      height: 4px;
      height: var(--x-slider-track-size, 4px);
      width: 100%;
      position: absolute;
      pointer-events: none;
    }
    #track {
      background: var(--x-slider-track-color);
    }
    #progress {
      transform-origin: left center;
      background: var(--x-slider-progress-color);
    }
    #slider-input {
      -ms-appearance: none;
      -moz-appearance: none;
      -webkit-appearance: none;
      appearance: none;
      width: 100%;
      height: 100%;
      margin: 0;
      position: relative;
      display: flex;
      align-items: center;
      background: transparent;
      outline: none;
    }
    #slider-input::-webkit-slider-thumb {
      -ms-appearance: none;
      -moz-appearance: none;
      -webkit-appearance: none;
      appearance: none;
      width: var(--x-slider-thumb-width);
      height: var(--x-slider-thumb-height);
      background: var(--x-slider-thumb-color);
      position: relative;
      transition: transform 0.2s;
      border-radius: var(--x-slider-thumb-radius);
    }
    #slider-input::-webkit-slider-thumb:focus,
    #slider-input::-webkit-slider-thumb:active {
      transform: scale(2);
    }
    `]
  }

  render() {
    return html`
      <div class='container'>
        <div id='track' class='bar'></div>
        <div
            id='progress'
            class='bar'
            style=${`transform: scaleX(${this.getProgressBarOffset()})`}>
        </div>
        <input
            id='slider-input'
            type='range'
            .value=${this.actualValue}
            min=${this.min}
            max=${this.max}
            @pointerdown=${() => { this.seeking = true; this.seekingValue = this.value }}
            @pointerup=${this.onChangeHandler}
            @input=${this.onInputHandler}>
      </div>
    `
  }

  firstUpdated() {
    if (isResizeObserverSupported) {
      // @ts-ignore
      const widthRo = new ResizeObserver(entries => entries.forEach(({ contentRect }) => {
        this.trackWidth = contentRect.width
      }))
      widthRo.observe(this.progressElement)
    }
  }

  onInputHandler(e: Event) {
    e.stopPropagation()
    const value = parseInt(this.sliderInputElement.value, 10)
    this.seekingValue = value
    this.value = value
    this.dispatchEvent(new CustomEvent('input', { detail: value }))
  }

  onChangeHandler() {
    this.seeking = false
    this.dispatchEvent(new CustomEvent('change', { detail: this.seekingValue }))
  }

  getProgressBarOffset() {
    if (!isResizeObserverSupported && this.progressElement) {
      this.trackWidth = this.progressElement.offsetWidth
    }
    return (this.trackWidth * this.actualValue / this.max) / this.trackWidth
  }
}
