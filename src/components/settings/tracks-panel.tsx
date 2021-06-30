import { Component, Show } from 'solid-js'
import { pluralize } from '../../utils'
import { useEntitiesStore } from '../../stores/stores'
import { isNativeFileSystemSupported } from '../../helpers/file-system'
import * as sharedStyles from '../../styles/shared.css'
import * as styles from './settings.css'

export const TracksPanel: Component = () => {
  const [entities, entitiesActions] = useEntitiesStore()

  // This could memo, but that might be overkill.
  const tracksCount = () => Object.keys(entities.tracks).length

  return (
    <div className={styles.tracksInfoPanel}>
      <div className={styles.tracksInfoText}>
        <div>
          Currently there are{' '}
          <strong className={styles.primaryText}>{tracksCount()}</strong>{' '}
          {pluralize(tracksCount(), 'track')} inside your library
        </div>
        <div className={styles.tracksInfoCaption}>
          All data is always stored on device
        </div>
      </div>
      <Show when={!isNativeFileSystemSupported}>
        <div className={styles.tracksWarnLegacyMessage}>
          <span>
            Your browser currently does not support&nbsp
            <a
              target='_blank'
              href='https://wicg.github.io/native-file-system/'
            >
              required technologies
            </a>
            , so in order for this app to work, each track (music file) must be
            &nbsp
            <strong>duplicated inside browser storage</strong>, that might
            consume alot of your device storage.
          </span>
        </div>
      </Show>
      <div className={styles.trackPanelActions}>
        <button
          className={sharedStyles.button.pill.regular}
          onClick={entitiesActions.clearData}
        >
          Clear data
        </button>
        <button
          className={sharedStyles.button.pill.primary}
          onClick={entitiesActions.importTracks}
        >
          Import tracks
        </button>
      </div>
    </div>
  )
}
