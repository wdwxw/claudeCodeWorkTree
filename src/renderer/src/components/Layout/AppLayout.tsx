import { Sidebar } from '../Sidebar/Sidebar'
import { AppHeader } from './AppHeader'
import { StatusBar } from './StatusBar'
import { ToastContainer } from './ToastContainer'
import { TerminalPanel } from '../Terminal/TerminalPanel'
import { SettingsPage } from '../Settings/SettingsPage'
import { useSettingsStore } from '../../stores/settingsStore'

export function AppLayout(): React.ReactElement {
  const showSettings = useSettingsStore((s) => s.showSettings)

  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {showSettings ? <SettingsPage /> : <TerminalPanel />}
        </div>
      </div>
      <StatusBar />
      <ToastContainer />
    </div>
  )
}
