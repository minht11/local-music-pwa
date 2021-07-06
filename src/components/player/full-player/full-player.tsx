import { useRouter } from '@rturnq/solid-router'
import { Component, createEffect, onCleanup, Show } from 'solid-js'
import { setElementVar } from '@vanilla-extract/dynamic'
import { IconButton, IconType } from '../../icon-button/icon-button'
import { Artwork } from '../components/artwork/artwork'
import { Controls } from '../components/controls/main-controls'
import { VolumePanel } from '../components/volume/volume-panel'
import { VolumeButton } from '../components/volume/volume-button'
import { Info } from '../components/info/info'
import { Timeline } from '../components/timeline/timeline'
import { clx } from '../../../utils'
import { useMenu } from '../../menu/menu'
import { BackButton } from '../../back-button/back-button'
import { useDocumentTitle } from '../../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../../types/constants'
import * as styles from './full-player.css'

const VolumeMenuContent = () => (
  <div className={styles.volumeMenuContent}>
    <VolumePanel />
  </div>
)

interface FullPlayerProps {
  isCompact: boolean
  ref?: HTMLDivElement
}

export const FullPlayer: Component<FullPlayerProps> = (props) => {
  useDocumentTitle(`Now Playing ${APP_TITLE_POSTFIX}`)

  const router = useRouter()
  const menu = useMenu()

  const onVolumeMenuClickHandler = (e: MouseEvent) => {
    menu?.show({ component: VolumeMenuContent }, e.target as HTMLElement, {
      anchor: true,
    })
  }

  const ro = new ResizeObserver(([entry]) => {
    const { CONTROLS_HEIGHT, PREFERRED_CONTROLS_WIDTH, CONTENT_GAP } = styles
    const USED_HEIGHT = CONTROLS_HEIGHT + CONTENT_GAP

    const { width, height } = entry.contentRect
    const availableSpaceY = height - USED_HEIGHT
    const availableSpaceX = width - PREFERRED_CONTROLS_WIDTH - CONTENT_GAP

    let artworkSize = 0
    if (availableSpaceY < availableSpaceX) {
      artworkSize = Math.min(height, availableSpaceX, PREFERRED_CONTROLS_WIDTH)
    } else {
      artworkSize = Math.min(width, availableSpaceY, PREFERRED_CONTROLS_WIDTH)
    }
    artworkSize = artworkSize > 64 ? artworkSize : 0

    setElementVar(
      entry.target as HTMLElement,
      styles.artworkSizeVar,
      `${artworkSize}px`,
    )
  })

  let playerContentEl!: HTMLDivElement
  createEffect(() => {
    ro.observe(playerContentEl)
  })

  onCleanup(() => {
    ro.disconnect()
  })

  return (
    <div
      className={clx(styles.fpPane, props.isCompact && styles.compact)}
      ref={props.ref}
    >
      <div className={styles.toolbar}>
        <BackButton icon={IconType.CHEVRON_DOWN} />
        <h1 className={styles.title}>Now Playing</h1>
        <div className={styles.toolbarSpacer} />
      </div>
      <div className={styles.content} ref={playerContentEl}>
        <Artwork className={styles.artwork} />
        <div className={styles.controls}>
          <Info bigTitle />
          <Timeline />
          <Controls />
          <div className={styles.secondaryActions}>
            <VolumeButton title='Volume' onClick={onVolumeMenuClickHandler} />
            <Show when={props.isCompact}>
              <IconButton
                title='Open queue'
                icon={IconType.PLAYLIST_PLAY}
                onClick={() => router.push('/player/queue')}
              />
            </Show>
          </div>
        </div>
      </div>
    </div>
  )
}
