import { Component, createMemo, Show } from 'solid-js'
import { pluralize } from '~/utils'
import { useEntitiesStore } from '~/stores/stores'
import { isNativeFileSystemSupported } from '~/helpers/file-system'
import { Icon } from '~/components/icon/icon'
import * as sharedStyles from '~/styles/shared.css'
import * as styles from './settings.css'

export const TracksPanel: Component = () => {
  const [entities, entitiesActions] = useEntitiesStore()

  const tracksCount = createMemo(() => Object.keys(entities.tracks).length)

  return (
    <div className={styles.tracksInfoPanel}>
      <div className={styles.tracksInfoText}>
        <div>
          Currently there are{' '}
          <strong className={styles.countText}>{tracksCount()}</strong>{' '}
          {pluralize(tracksCount(), 'track')} inside your library
        </div>
        <div className={styles.tracksInfoCaption}>
          All data is always stored on device
        </div>
      </div>
      <Show when={!isNativeFileSystemSupported}>
        <div className={styles.tracksWarnLegacyMessage}>
          <Icon icon='alertCircle' />
          <span>
            Your browser currently does not support&nbsp
            <a
              style='display: inline-block'
              target='_blank'
              href='https://wicg.github.io/file-system-access/'
            >
              required technologies
            </a>
            , so in order for this app to work, each track (music file) must
            be&nbsp
            <strong>duplicated inside browser storage</strong>, that might
            consume alot of your device storage.
          </span>
        </div>
      </Show>
      <div className={styles.trackPanelActions}>
        <button
          className={sharedStyles.outlinedButton}
          onClick={entitiesActions.clearData}
        >
          Clear data
        </button>
        <button
          className={sharedStyles.tonalButton}
          onClick={() => { entitiesActions.importTracks() }}
        >
          Import tracks
        </button>
      </div>
    </div>
  )
}
