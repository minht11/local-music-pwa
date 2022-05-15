import { useNavigate } from 'solid-app-router'
import { Show, VoidComponent } from 'solid-js'
import { createMediaQuery } from '~/helpers/hooks/create-media-query'
import { Artwork } from '../shared-player-components/artwork/artwork'
import { Controls } from '../shared-player-components/controls/main-controls'
import { PlayNextButton } from '../shared-player-components/controls/play-next-prev-buttons'
import { PlayPauseButton } from '../shared-player-components/controls/play-pause-button'
import { VolumePanel } from '../shared-player-components/volume/volume-panel'
import { Info } from '../shared-player-components/info/info'
import { Timeline } from '../shared-player-components/timeline/timeline'
import { clx } from '~/utils'
import { FavoriteButton } from '../shared-player-components/info/favorite-button'
import { Icon } from '../icon/icon'
import * as styles from './mini-player.css'

export interface MiniPlayerProps {
  class?: string | false
}

export const MiniPlayer: VoidComponent<MiniPlayerProps> = (props) => {
  const areMainControlsHidden = createMediaQuery(styles.COMPACT_MEDIA)

  const areSecondaryActionsVisible = createMediaQuery('(min-width: 421px)')
  const isPlayPauseButtonVisible = createMediaQuery('(min-width: 300px)')

  const navigate = useNavigate()

  return (
    <div class={clx(styles.container, props.class)}>
      {!areMainControlsHidden() && <Timeline />}

      <div class={styles.infoSection}>
        <button
          title='Open player'
          class={styles.openFullPlayerButton}
          onClick={() => navigate('/player')}
        >
          <div class={styles.artworkContainer}>
            <Icon icon='chevronUp' class={styles.artworkArrow} />
            <Artwork />
          </div>
          <Info />
        </button>

        {areSecondaryActionsVisible() && <FavoriteButton />}
      </div>
      <Show
        when={!areMainControlsHidden()}
        fallback={
          <>
            {isPlayPauseButtonVisible() && <PlayPauseButton />}
            {areSecondaryActionsVisible() && <PlayNextButton />}
          </>
        }
      >
        <Controls />
        <VolumePanel />
      </Show>
    </div>
  )
}
