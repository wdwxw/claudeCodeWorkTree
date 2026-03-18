import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToastStore } from '../../stores/toastStore'
import type { ExternalApp } from '../../types'
import { generateId } from '../../utils/helpers'

export function SettingsPage(): React.ReactElement {
  const externalApps = useSettingsStore((s) => s.externalApps)
  const setExternalApps = useSettingsStore((s) => s.setExternalApps)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)
  const addToast = useToastStore((s) => s.addToast)

  const [apps, setApps] = useState<ExternalApp[]>(externalApps)

  useEffect(() => {
    setApps(externalApps)
  }, [externalApps])

  const handleAddApp = (): void => {
    setApps([...apps, { id: generateId(), name: '', command: '', icon: 'terminal' }])
  }

  const handleRemoveApp = (id: string): void => {
    if (apps.length <= 1) {
      addToast('warning', '至少保留一个外部应用')
      return
    }
    setApps(apps.filter((a) => a.id !== id))
  }

  const handleUpdateApp = (id: string, field: keyof ExternalApp, value: string): void => {
    setApps(apps.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleSave = async (): Promise<void> => {
    const valid = apps.filter((a) => a.name.trim() && a.command.trim())
    if (valid.length === 0) {
      addToast('warning', '请至少配置一个有效的外部应用')
      return
    }
    await setExternalApps(valid)
    addToast('success', '设置已保存')
    toggleSettings()
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-bg-primary p-6">
      <div className="mx-auto w-full max-w-xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={toggleSettings}
            className="rounded-md p-1.5 text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-lg font-medium text-text-primary">设置</h1>
        </div>

        {/* External Apps */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-text-primary">外部应用</h2>
          <p className="mb-4 text-xs text-text-muted">
            配置可在胶囊按钮中打开的外部应用程序
          </p>

          <div className="space-y-2">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-center gap-2 rounded-lg border border-border-muted bg-bg-secondary p-3"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={app.name}
                      onChange={(e) => handleUpdateApp(app.id, 'name', e.target.value)}
                      placeholder="名称 (如: VS Code)"
                      className="flex-1 rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
                    />
                    <input
                      type="text"
                      value={app.command}
                      onChange={(e) => handleUpdateApp(app.id, 'command', e.target.value)}
                      placeholder="命令 (如: code)"
                      className="flex-1 rounded-md border border-border bg-bg-primary px-2.5 py-1.5 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
                    />
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveApp(app.id)}
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-elevated hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddApp}
            className="mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <Plus size={13} />
            添加应用
          </button>
        </section>

        {/* Keyboard shortcuts info */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-text-primary">快捷键</h2>
          <div className="space-y-2 text-xs text-text-secondary">
            <div className="flex items-center justify-between rounded-md bg-bg-secondary px-3 py-2">
              <span>新建 Worktree</span>
              <kbd className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-text-muted">
                Cmd+N
              </kbd>
            </div>
            <div className="flex items-center justify-between rounded-md bg-bg-secondary px-3 py-2">
              <span>打开设置</span>
              <kbd className="rounded bg-bg-elevated px-2 py-0.5 font-mono text-text-muted">
                Cmd+,
              </kbd>
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-xs text-white transition-colors hover:bg-accent-hover"
          >
            <Save size={13} />
            保存设置
          </button>
        </div>
      </div>
    </div>
  )
}
