import { Plus } from 'lucide-react'
import { useRepoStore } from '../../stores/repoStore'

export function AddRepoButton(): React.ReactElement {
  const addRepo = useRepoStore((s) => s.addRepo)

  return (
    <div className="border-t border-border-muted p-2">
      <button
        onClick={addRepo}
        className="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
      >
        <Plus size={14} />
        添加 Repo
      </button>
    </div>
  )
}
