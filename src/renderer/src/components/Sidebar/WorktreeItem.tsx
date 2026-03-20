import { useState } from 'react'
import type { Worktree } from '../../types'
import { useRepoStore } from '../../stores/repoStore'
import { ConfirmDialog } from '../Dialogs/ConfirmDialog'

interface WorktreeItemProps {
  worktree: Worktree
  repoId: string
}

export function WorktreeItem({ worktree, repoId }: WorktreeItemProps): React.ReactElement {
  const [showConfirm,    setShowConfirm]    = useState(false)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)
  const selectWorktree     = useRepoStore((s) => s.selectWorktree)
  const archiveWorktree    = useRepoStore((s) => s.archiveWorktree)

  const isSelected = selectedWorktreeId === worktree.id
  const isArchived = worktree.status === 'archived'
  const dirName    = worktree.path.split('/').pop() || worktree.branch

  return (
    <>
      {/* ws-item style — indented under repo */}
      <div
        className="group flex cursor-pointer items-center gap-[9px] rounded-[6px] transition-colors duration-100"
        style={{
          padding: '7px 8px 7px 16px',
          marginBottom: 1,
          opacity: isArchived ? 0.4 : 1,
          background: isSelected ? 'var(--ac, rgba(255,220,160,0.08))' : 'transparent',
        }}
        onMouseEnter={(e) => { if (!isSelected && !isArchived) e.currentTarget.style.background = 'var(--hv)' }}
        onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
        onClick={() => { if (!isArchived) selectWorktree(repoId, worktree.id) }}
      >
        {/* ws-ind: orange dot */}
        <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: isArchived
                ? 'var(--t4)'
                : isSelected
                  ? 'var(--orange, #c88832)'
                  : 'var(--color-success)',
              boxShadow: isSelected ? '0 0 5px rgba(200,136,50,0.45)' : undefined,
            }}
          />
        </div>

        {/* ws-info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="truncate text-[12px] leading-[1.3]"
            style={{
              color: isSelected ? 'var(--t1)' : 'var(--t2)',
              textDecoration: isArchived ? 'line-through' : undefined,
            }}
          >
            {worktree.branch}
          </div>
          <div className="truncate text-[11px] mt-[1px]" style={{ color: 'var(--t4)' }}>
            {dirName}
          </div>
        </div>

        {/* Archive button on hover */}
        {!isArchived && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfirm(true) }}
            title="归档"
            className="invisible flex items-center justify-center rounded p-[3px] transition-colors duration-100 group-hover:visible"
            style={{ color: 'var(--t4)', flexShrink: 0 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-warning)'
              e.currentTarget.style.background = 'var(--hv)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--t4)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="14" height="3" rx="1"/>
              <path d="M2 6h12v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1zM6 10h4"/>
            </svg>
          </button>
        )}
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="归档 Worktree"
          message={`确定要归档「${worktree.branch}」(${dirName}) 吗？这将执行 git worktree remove 操作。`}
          confirmLabel="归档"
          variant="warning"
          onConfirm={() => { archiveWorktree(repoId, worktree.id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  )
}
