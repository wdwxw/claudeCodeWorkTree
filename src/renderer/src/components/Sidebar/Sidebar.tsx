import { FolderGit2 } from 'lucide-react'
import { useRepoStore } from '../../stores/repoStore'
import { RepoItem } from './RepoItem'
import { AddRepoButton } from './AddRepoButton'

export function Sidebar(): React.ReactElement {
  const repos = useRepoStore((s) => s.repos)

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-r border-border-muted bg-bg-secondary">
      {/* Header */}
      <div className="flex h-10 items-center justify-between border-b border-border-muted px-3">
        <span className="text-xs font-semibold tracking-wide text-text-secondary uppercase">
          工作区
        </span>
      </div>

      {/* Repo list */}
      <div className="flex-1 overflow-y-auto py-1">
        {repos.length === 0 ? (
          <EmptyState />
        ) : (
          repos.map((repo) => <RepoItem key={repo.id} repo={repo} />)
        )}
      </div>

      {/* Add repo button */}
      <AddRepoButton />
    </div>
  )
}

function EmptyState(): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <FolderGit2 size={32} className="mb-3 text-text-muted" />
      <p className="text-sm text-text-secondary">暂无仓库</p>
      <p className="mt-1 text-xs text-text-muted">点击下方按钮添加 Git 仓库</p>
    </div>
  )
}
