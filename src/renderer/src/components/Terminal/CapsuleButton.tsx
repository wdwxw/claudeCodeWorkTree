import { useState, useRef, useEffect } from 'react'
import {
  ChevronDown, Code, Terminal, MonitorSmartphone, SquareTerminal,
  GitPullRequest, Edit, Braces, Zap, Globe, Type
} from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRepoStore } from '../../stores/repoStore'
import { useToastStore } from '../../stores/toastStore'
import { MergeDialog } from '../Dialogs/MergeDialog'
import type { ExternalApp } from '../../types'

const fallbackIconMap: Record<string, React.ReactElement> = {
  code: <Code size={13} />,
  edit: <Edit size={13} />,
  braces: <Braces size={13} />,
  zap: <Zap size={13} />,
  globe: <Globe size={13} />,
  type: <Type size={13} />,
  terminal: <Terminal size={13} />,
  'terminal-square': <SquareTerminal size={13} />,
  monitor: <MonitorSmartphone size={13} />
}

function AppIcon({ app, size = 18 }: { app: ExternalApp; size?: number }): React.ReactElement {
  if (app.iconBase64) {
    return <img src={app.iconBase64} alt={app.name} width={size} height={size} className="rounded-sm" />
  }
  return <span className="flex items-center justify-center">{fallbackIconMap[app.icon] || <Code size={size - 2} />}</span>
}

interface CapsuleButtonProps {
  cwd: string
}

export function CapsuleButton({ cwd }: CapsuleButtonProps): React.ReactElement {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showMerge, setShowMerge] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const lastExternalApp = useSettingsStore((s) => s.lastExternalApp)
  const externalApps = useSettingsStore((s) => s.externalApps)
  const setLastExternalApp = useSettingsStore((s) => s.setLastExternalApp)
  const addToast = useToastStore((s) => s.addToast)

  const repos = useRepoStore((s) => s.repos)
  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)

  const selectedRepo = repos.find((r) => r.id === selectedRepoId)
  const selectedWorktree = selectedRepo?.worktrees.find((w) => w.id === selectedWorktreeId)

  const lastApp = externalApps.find((a) => a.id === lastExternalApp) || externalApps[0]

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpenApp = async (appId: string): Promise<void> => {
    const app = externalApps.find((a) => a.id === appId)
    if (!app || !cwd) return
    const result = await window.api.app.openExternal(app.command, cwd)
    if (result.success) {
      await setLastExternalApp(appId)
    } else {
      addToast('error', `打开 ${app.name} 失败: ${result.error}`)
    }
    setShowDropdown(false)
  }

  if (!lastApp || externalApps.length === 0) {
    return <></>
  }

  return (
    <div className="flex items-center gap-2">
      {/* Capsule: Left-Right dual zone */}
      <div className="relative" ref={dropdownRef}>
        <div className="flex h-7 items-stretch overflow-hidden rounded-lg border border-border bg-bg-elevated text-xs shadow-sm">
          {/* Left zone: last used app with icon badge */}
          <button
            onClick={() => handleOpenApp(lastApp.id)}
            className="flex items-center gap-2 pl-1 pr-3 text-text-primary transition-colors hover:bg-bg-tertiary"
            title={`在 ${lastApp.name} 中打开`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
              <AppIcon app={lastApp} size={20} />
            </span>
            <span className="max-w-[120px] truncate whitespace-nowrap">
              {lastApp.name}
            </span>
          </button>

          {/* Divider */}
          <div className="w-px self-stretch bg-border" />

          {/* Right zone: dropdown trigger */}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-full items-center gap-1 px-2.5 text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
          >
            <span>Open</span>
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Dropdown menu — rendered OUTSIDE overflow-hidden capsule */}
        {showDropdown && (
          <div className="absolute right-0 top-8 z-50 w-52 overflow-hidden rounded-lg border border-border bg-bg-elevated py-1 shadow-2xl">
            {externalApps.map((app) => (
              <button
                key={app.id}
                onClick={() => handleOpenApp(app.id)}
                className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-xs text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded">
                  <AppIcon app={app} size={20} />
                </span>
                {app.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* PR button */}
      {selectedWorktree && (
        <button
          onClick={() => setShowMerge(true)}
          className="flex h-7 items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 text-xs text-text-secondary transition-colors hover:bg-bg-tertiary hover:text-text-primary"
        >
          <GitPullRequest size={13} />
          <span>PR</span>
        </button>
      )}

      {/* Merge dialog */}
      {showMerge && selectedRepo && selectedWorktree && (
        <MergeDialog
          repoPath={selectedRepo.path}
          sourceBranch={selectedWorktree.branch}
          onClose={() => setShowMerge(false)}
        />
      )}
    </div>
  )
}
