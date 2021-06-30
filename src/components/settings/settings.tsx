import { Component } from 'solid-js'
import { AppScrollContainer } from '../app-scroll-container/app-scroll-container'
import { TracksPanel } from './tracks-panel'
import { createMediaQuery } from '../../helpers/hooks/create-media-query'
import { useDocumentTitle } from '../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../types/constants'
import * as styles from './settings.css'

export const Settings: Component = () => {
  useDocumentTitle(`Settings ${APP_TITLE_POSTFIX}`)

  const isDarkTheme = createMediaQuery('(prefers-color-scheme: dark)')
  const isAnimationMotionReduced = createMediaQuery(
    '(prefers-reduced-motion: reduce)',
  )

  return (
    <AppScrollContainer
      classNames={{
        container: styles.pageContainer,
      }}
      headerProps={{
        title: 'Settings',
      }}
    >
      <TracksPanel />
      <section className={styles.section}>
        <h1 className={styles.subheader}>Settings controlled by your system</h1>
        <div className={styles.smallSettingsItem}>
          <div>Theme</div>
          <div>{isDarkTheme() ? 'Dark' : 'Light'}</div>
        </div>
        <div className={styles.smallSettingsItem}>
          <div>Animations</div>
          <div>{isAnimationMotionReduced() ? 'Reduced' : 'Full'}</div>
        </div>
      </section>
    </AppScrollContainer>
  )
}
