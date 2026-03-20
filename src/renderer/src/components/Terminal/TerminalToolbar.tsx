import { CornerDownLeft, Eye } from 'lucide-react'

interface TerminalToolbarProps {
  showCommandInput: boolean
  onToggleCommandInput: () => void
  onShowLog: () => void
}

export function TerminalToolbar({
  showCommandInput,
  onToggleCommandInput,
  onShowLog
}: TerminalToolbarProps): React.ReactElement {
  return (
    <div className="flex h-8 items-center gap-1 border-t border-border bg-bg-primary px-3">
      <button
        onClick={onToggleCommandInput}
        className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors ${
          showCommandInput
            ? 'bg-accent-muted text-accent'
            : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
        }`}
      >
        <CornerDownLeft size={13} />
        Enter
      </button>
      <button
        onClick={onShowLog}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
      >
        <Eye size={13} />
        Show
      </button>

      <div className="flex-1" />
    </div>
  )
}
