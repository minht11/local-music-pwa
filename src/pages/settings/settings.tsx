import { JSXElement } from 'solid-js'
import { TracksPanel } from './tracks-panel'
import { useDarkThemeEnabled, usePrefersReducedMotion } from '~/utils'
import { Scaffold } from '~/components/scaffold/scaffold'
import * as styles from './settings.css'

interface SmallListItemProps {
  label: string
  value: string
}

const SmallListItem = (props: SmallListItemProps) => (
  <div class={styles.smallSettingsItem}>
    <div>{props.label}</div>
    <div>{props.value}</div>
  </div>
)

const Settings = (): JSXElement => {
  const isDarkTheme = useDarkThemeEnabled()
  const prefersReducedMotion = usePrefersReducedMotion()

  return (
    <Scaffold title='Settings' scrollable>
      <TracksPanel />
      <section class={styles.section}>
        <h1 class={styles.subheader}>Settings controlled by your system</h1>
        <SmallListItem label='Theme' value={isDarkTheme() ? 'Dark' : 'Light'} />
        <SmallListItem
          label='Reduced motion'
          value={prefersReducedMotion() ? 'Reduced' : 'Full'}
        />
      </section>
    </Scaffold>
  )
}

export default Settings
