import { JSXElement } from 'solid-js'
import { version, description } from '../../../package.json'
import { Scaffold } from '~/components/scaffold/scaffold'
import * as styles from './about.css'

const AboutPage = (): JSXElement => (
  <Scaffold title='About' scrollable>
    <section className={styles.section}>
      <img src='/icons/icon_responsive.svg' className={styles.logo} />
      <div>{version}</div>
      <h1 className={styles.title}>Snae music player</h1>
      <div>{description}</div>
      <a href='https://github.com/minht11/local-music-pwa'>
        Source code on Github
      </a>
      <a href='https://github.com/minht11/local-music-pwa#privacy'>Privacy</a>
    </section>
  </Scaffold>
)

export default AboutPage
