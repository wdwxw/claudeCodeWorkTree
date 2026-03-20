import { useSettingsStore } from '../../stores/settingsStore'

interface QuickButtonsBarProps {
  onSend: (content: string, autoEnter: boolean) => void
}

export function QuickButtonsBar({ onSend }: QuickButtonsBarProps): React.ReactElement | null {
  const quickButtons = useSettingsStore((s) => s.quickButtons)

  if (quickButtons.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 border-t border-border bg-bg-primary px-3 py-1.5">
      {quickButtons.map((btn) => (
        <button
          key={btn.id}
          onClick={() => onSend(btn.content, btn.autoEnter)}
          title={btn.autoEnter ? `${btn.content}  （自动 Enter）` : btn.content}
          className="rounded-md border border-border-muted bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary transition-colors hover:border-accent hover:bg-accent-muted hover:text-accent"
        >
          {btn.title}
        </button>
      ))}
    </div>
  )
}
