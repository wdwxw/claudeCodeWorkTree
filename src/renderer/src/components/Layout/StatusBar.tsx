import { GitBranch, FolderGit2 } from 'lucide-react'
import { useRepoStore } from '../../stores/repoStore'

export function StatusBar(): React.ReactElement {
  const repos = useRepoStore((s) => s.repos)
  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)

  const selectedRepo = repos.find((r) => r.id === selectedRepoId)
  const selectedWorktree = selectedRepo?.worktrees.find((w) => w.id === selectedWorktreeId)

  const totalWorktrees = repos.reduce(
    (acc, r) => acc + r.worktrees.filter((w) => w.status === 'active').length,
    0
  )

  return (
    <div className="flex h-6 items-center border-t border-border bg-bg-secondary px-3 text-[11px]">
      {/* Branch indicator */}
      {selectedWorktree && (
        <div className="flex items-center gap-1.5 text-text-secondary">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span>{selectedWorktree.branch}</span>
        </div>
      )}

      {/* Path */}
      {selectedWorktree && (
        <span className="ml-4 max-w-[400px] truncate text-text-muted">
          {selectedWorktree.path}
        </span>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-text-muted">
        <span className="flex items-center gap-1">
          <FolderGit2 size={11} />
          {repos.length} repos
        </span>
        <span className="flex items-center gap-1">
          <GitBranch size={11} />
          {totalWorktrees} worktrees
        </span>
      </div>
    </div>
  )
}
