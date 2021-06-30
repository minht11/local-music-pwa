import { useRouter } from '@rturnq/solid-router'
import { Component, Show } from 'solid-js'
import { IconButton, IconType } from '../../icon-button/icon-button'
import { Artwork } from '../components/artwork/artwork'
import { Controls } from '../components/controls/main-controls'
import { VolumePanel } from '../components/volume/volume-panel'
import { VolumeButton } from '../components/volume/volume-button'
import { Info } from '../components/info/info'
import { Timeline } from '../components/timeline/timeline'
import { clx } from '../../../utils'
import { useMenu } from '../../menu/menu'
import * as styles from './full-player.css'
import { BackButton } from '../../back-button/back-button'
import { useDocumentTitle } from '../../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../../types/constants'

const VolumeMenuContent = () => (
  <div className={styles.volumeMenuContent}>
    <VolumePanel />
  </div>
)

interface FullPlayerProps {
  artworkRef: (element: HTMLDivElement) => void
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
      <div className={styles.content}>
        <Artwork className={styles.artwork} ref={props.artworkRef} />
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
