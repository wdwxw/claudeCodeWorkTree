import { useState, useEffect } from 'react'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import { useSettingsStore } from '../../stores/settingsStore'
import { useToastStore } from '../../stores/toastStore'
import type { ExternalApp, QuickButton } from '../../types'
import { generateId } from '../../utils/helpers'

export function SettingsPage(): React.ReactElement {
  const externalApps = useSettingsStore((s) => s.externalApps)
  const setExternalApps = useSettingsStore((s) => s.setExternalApps)
  const quickButtons = useSettingsStore((s) => s.quickButtons)
  const setQuickButtons = useSettingsStore((s) => s.setQuickButtons)
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)
  const addToast = useToastStore((s) => s.addToast)

  const [apps, setApps] = useState<ExternalApp[]>(externalApps)
  const [buttons, setButtons] = useState<QuickButton[]>(quickButtons)

  useEffect(() => {
    setApps(externalApps)
  }, [externalApps])

  useEffect(() => {
    setButtons(quickButtons)
  }, [quickButtons])

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

  const handleAddButton = (): void => {
    setButtons([...buttons, { id: generateId(), title: '', content: '', autoEnter: false }])
  }

  const handleRemoveButton = (id: string): void => {
    setButtons(buttons.filter((b) => b.id !== id))
  }

  const handleUpdateButton = (id: string, field: keyof QuickButton, value: string | boolean): void => {
    setButtons(buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  }

  const handleSave = async (): Promise<void> => {
    const validApps = apps.filter((a) => a.name.trim() && a.command.trim())
    if (validApps.length === 0) {
      addToast('warning', '请至少配置一个有效的外部应用')
      return
    }
    const validButtons = buttons.filter((b) => b.title.trim() && b.content.trim())
    await setExternalApps(validApps)
    await setQuickButtons(validButtons)
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

        {/* Quick Buttons */}
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-text-primary">快捷按钮</h2>
          <p className="mb-4 text-xs text-text-muted">
            配置终端底部的快捷命令按钮，点击后将内容追加到终端输入
          </p>

          <div className="space-y-2">
            {buttons.map((btn) => (
              <div
                key={btn.id}
                className="flex items-start gap-2 rounded-lg border border-border-muted bg-bg-secondary p-3"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <input
                    type="text"
                    value={btn.title}
                    onChange={(e) => handleUpdateButton(btn.id, 'title', e.target.value)}
                    placeholder="标题 (按钮显示文字)"
                    className="rounded-md border border-border bg-bg-primary px-2.5 py-1.5 text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
                  />
                  <textarea
                    value={btn.content}
                    onChange={(e) => handleUpdateButton(btn.id, 'content', e.target.value)}
                    placeholder="内容 (点击后追加到终端的文字)"
                    rows={2}
                    className="resize-none rounded-md border border-border bg-bg-primary px-2.5 py-1.5 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus:border-accent"
                  />
                  <label className="flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={btn.autoEnter}
                      onChange={(e) => handleUpdateButton(btn.id, 'autoEnter', e.target.checked)}
                      className="h-3.5 w-3.5 accent-accent"
                    />
                    <span className="text-xs text-text-secondary">自动 Enter（点击后自动执行）</span>
                  </label>
                </div>
                <button
                  onClick={() => handleRemoveButton(btn.id)}
                  className="mt-0.5 rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-elevated hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleAddButton}
            className="mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
          >
            <Plus size={13} />
            添加按钮
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
