import { AppShell } from '../components/app-shell'
import { LibraryView } from '../components/library-view/library-view'
import { PlayerPanel } from '../components/player-panel/player-panel'
import { InfoView } from '../components/info-view'
import { SettingsView } from '../components/settings-view'
import { TrackListItem } from '../components/track-list-item'
import { VirtualList } from '../components/virtual-list'
import { XDialog } from '../components/x-dialog'
import { XIconButton } from '../components/x-icon-button'
import { XIcon } from '../components/x-icon'
import { XMenu } from '../components/x-menu'
import { XSelect } from '../components/x-select'
import { XSlider } from '../components/x-slider'
import { XSwitch } from '../components/x-switch'
import { XToast } from '../components/x-toast'

declare global {
  interface HTMLElementTagNameMap {
    'app-shell': AppShell,
    'library-view': LibraryView,
    'player-panel': PlayerPanel,
    'info-view': InfoView,
    'settings-view': SettingsView,
    'track-list-item': TrackListItem,
    'virtual-list': VirtualList,
    'x-dialog': XDialog,
    'x-icon-button': XIconButton,
    'x-icon': XIcon,
    'x-menu': XMenu,
    'x-select': XSelect,
    'x-slider': XSlider,
    'x-switch': XSwitch,
    'x-toast': XToast,
  }
}
