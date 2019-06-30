import { css } from 'lit-element'
import { scrollbarStyles, headingStyles } from '../shared-styles'

const playerPanelStyles = css`
:host {
  --player-bar-timeline-height: 16px;
  --player-bar-content-height: calc(var(--player-offset) - var(--player-bar-timeline-height));
}
#player-bar {
  width: 100%;
  height: calc(var(--player-bar-timeline-height) + var(--player-bar-content-height));
  position: fixed;
  bottom: 0;
  background: var(--app-surface-1-color);
  box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.player-timeline-slider {
  height: var(--player-bar-timeline-height);
  width: 100%;
  --x-slider-track-size: var(--player-bar-timeline-height);
  --x-slider-thumb-width: 4px;
  --x-slider-thumb-radius: 0;
  --x-slider-thumb-color: var(--app-primary-text-color);
}

#player-bar-content {
  display: flex;
}
#player-bar-img {
  height: var(--player-bar-content-height);
  width: var(--player-bar-content-height);
}
.img {
  background-size: cover;
  background-color: var(--app-divider-color);
  flex-shrink: 0;
}
.active-track-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 24px;
  width: 100%;
  max-width: 256px;
  box-sizing: border-box;
  overflow: hidden;
}
.active-track-info * {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.controls {
  display: flex;
  margin: 0 auto;
  justify-content: center;
  align-items: center;
}
.controls[disabled] x-icon-button{
  opacity: .4;
  pointer-events: none;
}
.controls[disabled] #queue-button {
  opacity: 1;
  pointer-events: initial;
}
.secondary-controls {
  display: flex;
  margin: 0 0 0 auto;
  align-items: center;
}
x-icon-button {
  height: 40px;
  width: 40px;
  margin: 0 4px;
}
.play-button {
  height: 48px;
  width: 48px;
  background-color: var(--app-accent-color);
}
.play-button-icon {
  -webkit-mask-image: url(/images/play-pause-animation.svg);
  -moz-mask-image: url(/images/play-pause-animation.svg);
  -ms-mask-image: url(/images/play-pause-animation.svg);
  mask-image: url(/images/play-pause-animation.svg);
  background-color: var(--app-icon-color);
  animation-duration: 300ms;
  animation-timing-function: steps(18);
  background-repeat: no-repeat;
  animation-fill-mode: both;
  animation-name: play-to-pause;
  height: 24px;
  width: 24px;
}
.play-button-icon[playing] {
  animation-name: pause-to-play;
}
@keyframes pause-to-play {
  0% {
    -webkit-mask-position: 0px 0px;
  }
  100% {
    -webkit-mask-position: -432px 0px;
  }
}
@keyframes play-to-pause {
  0% {
    -webkit-mask-position: -432px 0px;
  }
  100% {
    -webkit-mask-position: 0px 0px;
  }
}

.volume-container {
  display: flex;
  align-items: center;
}

.volume-slider {
  min-width: 100px;
  width: 100px;
  height: 40px;
  margin: 0 16px 0 0;
} 

.timeline {
  position: relative;
  width: 100%;
  height: 16px;
  top: 0;
}
.time {
  position: absolute;
  font-size: 12px;
  margin: 0 8px;
  top: 0;
  line-height: 16px;
  pointer-events: none;
}
.time-end {
  right: 0;
}
#queue-panel {
  display: block;
  position: absolute;
  background: var(--app-surface-0-color);
  top: 0;
  height: calc(100% - 88px);
  width: 100%;
  overflow: auto;
}
#queue-panel[hidden] {
  display: none;
}
.content {
  background: var(--app-surface-1-color);
  max-width: 1000px;
  width: 100%;
  min-height: calc(100% - var(--app-header-height));
  margin: auto;
  display: flex;
  flex-direction: column;
  padding: 16px 0 24px;
  margin-top: var(--app-header-height);
  border-radius: 24px 24px 0 0;
  box-sizing: border-box;
}
#queue-header {
  display: flex;
  background: var(--app-surface-0-color);
  height: var(--app-header-height);
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  z-index: 1;
}
virtual-list {
  overflow: initial;
}
h1 {
  margin: auto;
}
#queue-player {
  display: flex;
}

@media (max-width: 700px) {
  #queue-panel {
    height: 100%;
  }
  #player-bar[hidden] {
    display: none;
  }
  #player-bar {
    --player-bar-timeline-height: 4px;
    --player-bar-content-height: calc(var(--player-offset) - var(--player-bar-timeline-height));
  }
  #player-bar .controls {
    margin-right: 0;
  }
  #player-bar .player-timeline-slider {
    pointer-events: none;
  }
  #queue-player-img {
    margin: 24px;
    width: 128px;
    height: 128px;
    border-radius: 8px;
  }
  #queue-player-right {
    align-items: center;
    display: flex;
    flex-direction: column;
    width: 100%;
    justify-content: space-between;
    margin: 24px 24px 24px 0;
    box-sizing: border-box;
    background: var(--app-surface-2-color);
    border-radius: 8px;
  }
  #queue-player-controls {
    justify-content: space-between;
    width: 100%;
    height: 72px;
    border-top: 1px solid var(--app-divider-color);
    flex-shrink: 0;
    padding: 0 16px;
    box-sizing: border-box;
  }
  .volume-container {
    height: 56px;
    width: 100%;
    justify-content: center;
    padding: 0 16px;
    box-sizing: border-box;
  }
  .volume-slider {
    width: 100%;
  }
  .content {
    padding-top: 0;
  }
  .active-track-info {
    padding: 0 16px;
    max-width: 100%;
  }
  #queue-panel .active-track-info {
    height: 64px;
    width: 100%;
    flex-shrink: 0;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--app-divider-color);
    padding: 0 24px;
  }
}

@media (max-width: 448px) {
  #queue-player {
    flex-direction: column;
  }
  #queue-player-img {
    margin: 24px 24px 0;
    padding-top: calc(100% - 48px);
    width: calc(100% - 48px);
    height: 0;
  }
  #queue-player-controls {
    justify-content: space-between;
    box-sizing: border-box;
  }
  #queue-player-right {
    margin: 24px;
    width: auto;
  }
  #mini-next-button {
    display: none;
  }
}
`

export default [
  playerPanelStyles,
  scrollbarStyles,
  headingStyles,
]
