import { useState } from 'react'
import { Archive } from 'lucide-react'
import type { Worktree } from '../../types'
import { useRepoStore } from '../../stores/repoStore'
import { ConfirmDialog } from '../Dialogs/ConfirmDialog'

interface WorktreeItemProps {
  worktree: Worktree
  repoId: string
}

export function WorktreeItem({ worktree, repoId }: WorktreeItemProps): React.ReactElement {
  const [showConfirm, setShowConfirm] = useState(false)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)
  const selectWorktree = useRepoStore((s) => s.selectWorktree)
  const archiveWorktree = useRepoStore((s) => s.archiveWorktree)

  const isSelected = selectedWorktreeId === worktree.id
  const isArchived = worktree.status === 'archived'

  const dirName = worktree.path.split('/').pop() || worktree.branch

  return (
    <>
      <div
        className={`group flex h-7 cursor-pointer items-center gap-2 pl-7 pr-2 text-xs transition-colors ${
          isArchived
            ? 'text-text-muted line-through opacity-50'
            : isSelected
              ? 'bg-accent-muted text-accent'
              : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        }`}
        onClick={() => {
          if (!isArchived) {
            selectWorktree(repoId, worktree.id)
          }
        }}
      >
        <span
          className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
            isArchived ? 'bg-text-muted' : isSelected ? 'bg-accent' : 'bg-success'
          }`}
        />
        <span className="flex-1 truncate" title={worktree.branch}>
          {worktree.branch}
        </span>
        {!isArchived && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowConfirm(true)
            }}
            className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-opacity hover:text-warning group-hover:opacity-100"
            title="归档"
          >
            <Archive size={12} />
          </button>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="归档 Worktree"
          message={`确定要归档「${worktree.branch}」(${dirName}) 吗？这将执行 git worktree remove 操作。`}
          confirmLabel="归档"
          variant="warning"
          onConfirm={() => {
            archiveWorktree(repoId, worktree.id)
            setShowConfirm(false)
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
