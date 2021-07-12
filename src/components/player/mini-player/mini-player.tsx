import { useRouter } from '@rturnq/solid-router'
import { Show } from 'solid-js'
import { createMediaQuery } from '../../../helpers/hooks/create-media-query'
import { IconButton, IconType } from '../../icon-button/icon-button'
import { Artwork } from '../components/artwork/artwork'
import { Controls } from '../components/controls/main-controls'
import { PlayNextButton } from '../components/controls/play-next-prev-buttons'
import { PlayPauseButton } from '../components/controls/play-pause-button'
import { VolumePanel } from '../components/volume/volume-panel'
import { Info } from '../components/info/info'
import { Timeline } from '../components/timeline/timeline'
import * as styles from './mini-player.css'

const OpenFullPlayerButton = () => {
  const router = useRouter()
  return (
    <IconButton
      title='Open player'
      icon={IconType.CHEVRON_UP}
      onClick={() => router.push('/player')}
    />
  )
}

export const MiniPlayer = () => {
  const areMainControlsHidden = createMediaQuery(
    '(max-width: 700px), (max-height: 440px)',
  )
  const isPlayNextButtonHidden = createMediaQuery('(max-width: 448px)')
  const isFavoritesButtonHidden = createMediaQuery('(max-width: 420px)')
  const isPlayPauseButtonHidden = createMediaQuery('(max-width: 264px)')

  return (
    <div className={styles.container}>
      <Show when={!areMainControlsHidden()}>
        <Timeline />
      </Show>
      <Artwork className={styles.artwork} />
      <Info
        className={!areMainControlsHidden() && styles.fixedWidthInfo}
        hideFavoriteBtn={isFavoritesButtonHidden()}
      />
      <Show
        when={!areMainControlsHidden()}
        fallback={
          <div className={styles.secondaryControls}>
            <Show when={!isPlayPauseButtonHidden()}>
              <PlayPauseButton />
            </Show>
            <Show when={!isPlayNextButtonHidden()}>
              <PlayNextButton />
            </Show>
            <OpenFullPlayerButton />
          </div>
        }
      >
        <Controls />
        <div className={styles.secondaryControls}>
          <VolumePanel />
          <OpenFullPlayerButton />
        </div>
      </Show>
    </div>
  )
}
