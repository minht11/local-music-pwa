import { FocusTrap } from '@a11y/focus-trap'

declare global {
  interface Window {
    isSupportedBrowser?: boolean
  }

  interface Navigator {
    userAgentData: {
      mobile: boolean
    }
  }

  interface IDBFactory {
    databases(): Promise<IDBDatabase[]>
  }

  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: Array<string>
    readonly userChoice: Promise<{
      outcome: 'accepted' | 'dismissed'
      platform: string
    }>
    prompt(): Promise<void>
  }
}

/* eslint-disable @typescript-eslint/no-namespace */
declare module 'solid-js' {
  namespace JSX {
    interface IntrinsicElements {
      'focus-trap': HTMLAttributes<FocusTrap>
    }
  }
}
