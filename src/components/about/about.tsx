import { AppScrollContainer } from '../app-scroll-container/app-scroll-container'
import { useDocumentTitle } from '../../helpers/hooks/use-document-title'
import { APP_TITLE_POSTFIX } from '../../types/constants'
import { version, description } from '../../../package.json'
import * as styles from './about.css'

export const About = () => {
  useDocumentTitle(`About ${APP_TITLE_POSTFIX}`)

  return (
    <AppScrollContainer
      classNames={{ container: styles.pageContainer }}
      headerProps={{ title: 'About' }}
    >
      <section className={styles.section}>
        <img src='/icons/icon_192.png' className={styles.logo} />
        <div>{version}</div>
        <h1 className={styles.title}>Snae music player</h1>
        <div>{description}</div>
        <a href='https://github.com/minht11/local-music-pwa'>
          Source code on Github
        </a>
      </section>
    </AppScrollContainer>
  )
}
