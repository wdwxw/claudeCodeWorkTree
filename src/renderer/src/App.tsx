import { useEffect } from 'react'
import { AppLayout } from './components/Layout/AppLayout'
import { useRepoStore } from './stores/repoStore'
import { useSettingsStore } from './stores/settingsStore'

export default function App(): React.ReactElement {
  const loadRepos = useRepoStore((s) => s.loadRepos)
  const loadSettings = useSettingsStore((s) => s.loadSettings)

  useEffect(() => {
    loadRepos()
    loadSettings()
  }, [loadRepos, loadSettings])

  return <AppLayout />
}
