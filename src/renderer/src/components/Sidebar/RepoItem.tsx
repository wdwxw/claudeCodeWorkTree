import { useState } from 'react'
import { ChevronDown, ChevronRight, Plus, MoreHorizontal, Trash2, FolderGit2 } from 'lucide-react'
import type { Repo } from '../../types'
import { useRepoStore } from '../../stores/repoStore'
import { WorktreeItem } from './WorktreeItem'
import { ConfirmDialog } from '../Dialogs/ConfirmDialog'

interface RepoItemProps {
  repo: Repo
}

export function RepoItem({ repo }: RepoItemProps): React.ReactElement {
  const [expanded, setExpanded] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectRepo = useRepoStore((s) => s.selectRepo)
  const removeRepo = useRepoStore((s) => s.removeRepo)
  const createWorktree = useRepoStore((s) => s.createWorktree)

  const isSelected = selectedRepoId === repo.id
  const activeWorktrees = repo.worktrees.filter((w) => w.status === 'active')
  const archivedWorktrees = repo.worktrees.filter((w) => w.status === 'archived')

  return (
    <div className="select-none">
      {/* Repo header */}
      <div
        className={`group flex h-8 cursor-pointer items-center gap-1 px-2 text-sm transition-colors hover:bg-bg-elevated ${
          isSelected ? 'bg-bg-elevated' : ''
        }`}
        onClick={() => {
          selectRepo(repo.id)
          setExpanded(!expanded)
        }}
      >
        {expanded ? (
          <ChevronDown size={14} className="shrink-0 text-text-muted" />
        ) : (
          <ChevronRight size={14} className="shrink-0 text-text-muted" />
        )}
        <FolderGit2 size={14} className="shrink-0 text-text-secondary" />
        <span className="flex-1 truncate text-text-primary">{repo.name}</span>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation()
              createWorktree(repo.id)
            }}
            className="rounded p-0.5 text-text-secondary hover:bg-accent-muted hover:text-accent"
            title="新建 Worktree"
          >
            <Plus size={14} />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="rounded p-0.5 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-6 z-20 w-32 overflow-hidden rounded-md border border-border bg-bg-elevated shadow-xl">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowMenu(false)
                      setShowConfirm(true)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-danger transition-colors hover:bg-bg-tertiary"
                  >
                    <Trash2 size={12} />
                    删除
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Worktree list */}
      {expanded && (
        <div>
          {activeWorktrees.map((wt) => (
            <WorktreeItem key={wt.id} worktree={wt} repoId={repo.id} />
          ))}
          {/* Archived worktrees hidden from sidebar */}
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirm && (
        <ConfirmDialog
          title="删除仓库"
          message={`确定要从列表中移除「${repo.name}」吗？此操作不会删除磁盘上的文件。`}
          confirmLabel="删除"
          variant="danger"
          onConfirm={() => {
            removeRepo(repo.id)
            setShowConfirm(false)
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  )
}
