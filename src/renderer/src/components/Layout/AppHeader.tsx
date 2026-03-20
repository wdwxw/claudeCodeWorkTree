import { GitBranch, Settings } from 'lucide-react'
import { useRepoStore } from '../../stores/repoStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { CapsuleButton } from '../Terminal/CapsuleButton'

export function AppHeader(): React.ReactElement {
  const repos = useRepoStore((s) => s.repos)
  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  const selectedRepo = repos.find((r) => r.id === selectedRepoId)
  const selectedWorktree = selectedRepo?.worktrees.find((w) => w.id === selectedWorktreeId)
  const currentCwd = selectedWorktree?.path || selectedRepo?.path || ''

  return (
    <div className="drag-region relative z-20 flex h-11 items-center border-b border-border bg-bg-secondary px-4">
      {/* macOS traffic light space */}
      <div className="w-16 shrink-0" />

      {/* Breadcrumb */}
      <div className="no-drag flex items-center gap-1.5 text-sm">
        <GitBranch size={14} className="text-accent" />
        <span className="font-medium text-text-primary">ccw</span>
        {selectedRepo && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-text-secondary">{selectedRepo.name}</span>
          </>
        )}
        {selectedWorktree && (
          <>
            <span className="text-text-muted">/</span>
            <span className="text-accent">{selectedWorktree.branch}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      {/* Right actions: capsule + time + settings */}
      <div className="no-drag flex items-center gap-3">
        {selectedRepo && <CapsuleButton cwd={currentCwd} />}
        <span className="text-xs text-text-muted">
          {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button
          onClick={toggleSettings}
          className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
        >
          <Settings size={15} />
        </button>
      </div>
    </div>
  )
}
