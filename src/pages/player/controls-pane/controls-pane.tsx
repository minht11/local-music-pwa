import { useNavigate } from 'solid-app-router'
import { createSignal, JSXElement } from 'solid-js'
import { IconButton } from '~/components/icon-button/icon-button'
import { Artwork } from '~/components/shared-player-components/artwork/artwork'
import { Controls } from '~/components/shared-player-components/controls/main-controls'
import { VolumePanel } from '~/components/shared-player-components/volume/volume-panel'
import { VolumeButton } from '~/components/shared-player-components/volume/volume-button'
import { Info } from '~/components/shared-player-components/info/info'
import { FavoriteButton } from '~/components/shared-player-components/info/favorite-button'
import { Timeline } from '~/components/shared-player-components/timeline/timeline'
import { clx, useResizeObserver } from '~/utils'
import { useMenu } from '~/components/menu/menu'
import {
  CONTROLS_HEIGHT,
  PREFERRED_CONTROLS_WIDTH,
  CONTENT_GAP,
} from './controls-pane.css'
import { AppTopBar } from '~/components/app-top-bar/app-top-bar'
import * as styles from './controls-pane.css'

const VolumeMenuContent = () => (
  <div className={styles.volumeMenuContent}>
    <VolumePanel />
  </div>
)

export interface FullPlayerProps {
  pinned?: boolean
}

export const ControlsPane = (props: FullPlayerProps): JSXElement => {
  const navigate = useNavigate()
  const menu = useMenu()

  const onVolumeMenuClickHandler = (e: MouseEvent) => {
    menu.show({ component: VolumeMenuContent }, e.target as HTMLElement, {
      anchor: true,
    })
  }

  const [isHorizontalLayout, setIsHorizontalLayout] = createSignal(true)

  let playerContentEl!: HTMLDivElement
  useResizeObserver(
    () => playerContentEl,
    (entry) => {
      const USED_HEIGHT = CONTROLS_HEIGHT + CONTENT_GAP

      const { width, height } = entry.contentRect
      const availableSpaceY = height - USED_HEIGHT
      const availableSpaceX = width - PREFERRED_CONTROLS_WIDTH - CONTENT_GAP

      const isHorizontal =
        availableSpaceY <= PREFERRED_CONTROLS_WIDTH ||
        availableSpaceX >= availableSpaceY

      setIsHorizontalLayout(isHorizontal)
    },
  )

  return (
    <div
      className={clx(
        styles.controlsPane,
        isHorizontalLayout() && styles.horizontalLayout,
        props.pinned && styles.pinned,
      )}
    >
      <AppTopBar title='Now Playing' scrollAware={false} />
      <div className={styles.content} ref={playerContentEl}>
        <Artwork className={styles.artwork} />
        <div className={styles.controls}>
          <div className={styles.info}>
            <Info bigTitle />
            <FavoriteButton />
          </div>
          <Timeline />
          <Controls />
          <div className={styles.secondaryActions}>
            <VolumeButton title='Volume' onClick={onVolumeMenuClickHandler} />
            {!props.pinned && (
              <IconButton
                title='Open queue'
                icon='playlistPlay'
                onClick={() => navigate('/player/queue')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
