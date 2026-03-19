import { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import { useRepoStore } from '../../stores/repoStore'
import { TerminalToolbar } from './TerminalToolbar'
import { CommandInput } from './CommandInput'
import { QuickButtonsBar } from './QuickButtonsBar'
import { TerminalLogModal } from './TerminalLogModal'
import { TerminalSquare, FolderOpen, Plus, X, Pencil } from 'lucide-react'

// iTerm2 default dark theme colors
const XTERM_THEME = {
  background: '#1e1e1e',
  foreground: '#c7c7c7',
  cursor: '#c7c7c7',
  cursorAccent: '#1e1e1e',
  selectionBackground: 'rgba(215, 215, 215, 0.25)',
  selectionForeground: undefined,
  black: '#000000',
  red: '#c91b00',
  green: '#00c200',
  yellow: '#c7c400',
  blue: '#0225c7',
  magenta: '#c930c7',
  cyan: '#00c5c7',
  white: '#c7c7c7',
  brightBlack: '#676767',
  brightRed: '#ff6d67',
  brightGreen: '#5ff967',
  brightYellow: '#fefb67',
  brightBlue: '#6871ff',
  brightMagenta: '#ff76ff',
  brightCyan: '#5ffdff',
  brightWhite: '#fffefe'
}

interface WorktreeTerminal {
  xterm: Terminal
  ptyId: string
  cleanup: () => void
  cwd: string
  fitAddon: FitAddon
  element: HTMLDivElement
  name: string
}

interface SessionGroup {
  sessions: WorktreeTerminal[]
  activeIndex: number
}

export function TerminalPanel(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentPtyId = useRef<string | null>(null)
  // worktreeId -> SessionGroup (多 session 支持)
  const sessionGroups = useRef(new Map<string, SessionGroup>())
  const currentWorktreeId = useRef<string | null>(null)
  const generationRef = useRef(0)

  const [showCommandInput, setShowCommandInput] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [terminalPath, setTerminalPath] = useState('')
  const [logBuffer, setLogBuffer] = useState('')
  // 驱动 tab 栏重渲染
  const [sessionVersion, setSessionVersion] = useState(0)
  // 正在编辑的 tab：{ wtId, index }
  const [editingTab, setEditingTab] = useState<{ wtId: string; index: number } | null>(null)
  const [editingName, setEditingName] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)
  const repos = useRepoStore((s) => s.repos)

  const selectedRepo = repos.find((r) => r.id === selectedRepoId)
  const selectedWorktree = selectedRepo?.worktrees.find((w) => w.id === selectedWorktreeId)
  const currentCwd = selectedWorktree?.path || selectedRepo?.path || ''
  const hasSelection = selectedRepo !== undefined

  const wtId = selectedWorktreeId || (selectedRepoId ? `repo-${selectedRepoId}` : null)
  const currentGroup = wtId ? sessionGroups.current.get(wtId) : undefined
  const sessionCount = currentGroup?.sessions.length ?? 0
  const activeSessionIndex = currentGroup?.activeIndex ?? 0

  const destroyAllTerminals = useCallback(async () => {
    for (const [, group] of sessionGroups.current) {
      for (const terminal of group.sessions) {
        terminal.cleanup()
        await window.api.pty.kill(terminal.ptyId)
        terminal.xterm.dispose()
        terminal.element.remove()
      }
    }
    sessionGroups.current.clear()
    xtermRef.current = null
    fitAddonRef.current = null
    currentPtyId.current = null
    currentWorktreeId.current = null
  }, [])

  const createTerminalInstance = useCallback(
    async (wtId: string, cwd: string, sessionIdx: number): Promise<WorktreeTerminal | null> => {
      if (!containerRef.current || !cwd) return null

      const gen = ++generationRef.current

      const xterm = new Terminal({
        cursorBlink: true,
        cursorStyle: 'bar',
        fontSize: 14,
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: XTERM_THEME,
        allowProposedApi: true,
        scrollback: 10000,
        fontWeight: 'normal',
        fontWeightBold: 'bold',
        macOptionIsMeta: true
      })

      const fitAddon = new FitAddon()
      xterm.loadAddon(fitAddon)
      xterm.loadAddon(new WebLinksAddon())
      xterm.loadAddon(new SearchAddon())

      const ptyId = `pty-${wtId}-s${sessionIdx}-${Date.now()}`

      await window.api.pty.create(ptyId, cwd)

      if (gen !== generationRef.current) {
        await window.api.pty.kill(ptyId)
        return null
      }

      xterm.attachCustomKeyEventHandler((e) => {
        if (e.type !== 'keydown') return true
        if (e.code === 'Enter' && e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          window.api.pty.write(ptyId, '\x1b\r')
          return false
        }
        if (e.code === 'Enter' && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
          e.preventDefault()
          window.api.pty.write(ptyId, '\x1b\r')
          return false
        }
        return true
      })

      xterm.onData((data) => window.api.pty.write(ptyId, data))
      xterm.onResize(({ cols, rows }) => window.api.pty.resize(ptyId, cols, rows))

      const removeDataListener = window.api.pty.onData(ptyId, (data) => xterm.write(data))
      const removeExitListener = window.api.pty.onExit(ptyId, () => {
        xterm.writeln('\r\n\x1b[33m终端会话已结束\x1b[0m')
      })

      const cleanup = () => {
        removeDataListener()
        removeExitListener()
      }

      const element = document.createElement('div')
      element.style.cssText = 'position: absolute; inset: 0; display: none;'
      containerRef.current.appendChild(element)

      xterm.open(element)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      try {
        fitAddon.fit()
      } catch {
        /* initial fit may fail */
      }

      await window.api.pty.resize(ptyId, xterm.cols, xterm.rows)

      if (gen !== generationRef.current) {
        cleanup()
        await window.api.pty.kill(ptyId)
        xterm.dispose()
        element.remove()
        return null
      }

      return { xterm, ptyId, cleanup, cwd, fitAddon, element, name: 'Untitled' }
    },
    []
  )

  // 激活某个 session（显示其 element，更新 refs）
  const activateSession = useCallback(
    async (wtId: string, terminal: WorktreeTerminal, skipWorktreeCheck = false) => {
      if (!skipWorktreeCheck && currentWorktreeId.current === wtId) {
        // 仅更新 refs，不跳过（可能切换了 session index）
      }

      // 隐藏所有 session 的 element
      for (const [, group] of sessionGroups.current) {
        for (const t of group.sessions) {
          t.element.style.display = 'none'
        }
      }
      terminal.element.style.display = 'block'

      await new Promise((resolve) => requestAnimationFrame(resolve))
      try {
        terminal.fitAddon.fit()
      } catch {
        /* ignore */
      }

      xtermRef.current = terminal.xterm
      fitAddonRef.current = terminal.fitAddon
      currentPtyId.current = terminal.ptyId
      currentWorktreeId.current = wtId
      setTerminalPath(terminal.cwd)

      await window.api.pty.resize(terminal.ptyId, terminal.xterm.cols, terminal.xterm.rows)
      terminal.xterm.focus()
    },
    []
  )

  // 新增一个 session（"+" 按钮调用）
  const handleAddSession = useCallback(async () => {
    if (!wtId || !currentCwd) return

    const group = sessionGroups.current.get(wtId)
    if (!group) return

    const sessionIdx = group.sessions.length
    const terminal = await createTerminalInstance(wtId, currentCwd, sessionIdx)
    if (!terminal) return

    group.sessions.push(terminal)
    group.activeIndex = group.sessions.length - 1
    setSessionVersion((v) => v + 1)

    await activateSession(wtId, terminal, true)
  }, [wtId, currentCwd, createTerminalInstance, activateSession])

  // 切换到指定 session index
  const handleSwitchSession = useCallback(
    async (index: number) => {
      if (!wtId) return
      const group = sessionGroups.current.get(wtId)
      if (!group || index < 0 || index >= group.sessions.length) return
      if (group.activeIndex === index) return

      group.activeIndex = index
      setSessionVersion((v) => v + 1)
      await activateSession(wtId, group.sessions[index], true)
    },
    [wtId, activateSession]
  )

  // 关闭指定 session
  const handleCloseSession = useCallback(
    async (index: number) => {
      if (!wtId) return
      const group = sessionGroups.current.get(wtId)
      if (!group || group.sessions.length <= 1) return // 至少保留一个

      const terminal = group.sessions[index]
      terminal.cleanup()
      await window.api.pty.kill(terminal.ptyId)
      terminal.xterm.dispose()
      terminal.element.remove()

      group.sessions.splice(index, 1)

      // 调整 activeIndex
      const newActive = Math.min(group.activeIndex, group.sessions.length - 1)
      group.activeIndex = newActive
      setSessionVersion((v) => v + 1)

      // 激活新的 active session
      await activateSession(wtId, group.sessions[newActive], true)
    },
    [wtId, activateSession]
  )

  // 开始编辑 tab 名称
  const handleStartEdit = useCallback(
    (e: React.MouseEvent, targetWtId: string, index: number, currentName: string) => {
      e.stopPropagation()
      setEditingTab({ wtId: targetWtId, index })
      setEditingName(currentName)
      // 下一帧聚焦输入框
      requestAnimationFrame(() => editInputRef.current?.focus())
    },
    []
  )

  // 提交编辑
  const handleCommitEdit = useCallback(() => {
    if (!editingTab) return
    const group = sessionGroups.current.get(editingTab.wtId)
    if (group && group.sessions[editingTab.index]) {
      group.sessions[editingTab.index].name = editingName.trim() || 'Untitled'
      setSessionVersion((v) => v + 1)
    }
    setEditingTab(null)
  }, [editingTab, editingName])

  // Handle worktree/repo selection and terminal switching
  useEffect(() => {
    if (!hasSelection || !currentCwd || !wtId) return

    const existingGroup = sessionGroups.current.get(wtId)
    if (existingGroup) {
      // 切换到该 worktree 已有的 active session
      const terminal = existingGroup.sessions[existingGroup.activeIndex]
      if (currentWorktreeId.current !== wtId) {
        activateSession(wtId, terminal)
        setSessionVersion((v) => v + 1)
      }
    } else {
      // 首次为该 worktree 创建 session
      createTerminalInstance(wtId, currentCwd, 0).then(async (terminal) => {
        if (terminal) {
          // 隐藏所有其他终端
          for (const [, group] of sessionGroups.current) {
            for (const t of group.sessions) {
              t.element.style.display = 'none'
            }
          }
          terminal.element.style.display = 'block'

          sessionGroups.current.set(wtId, { sessions: [terminal], activeIndex: 0 })
          currentWorktreeId.current = wtId
          xtermRef.current = terminal.xterm
          fitAddonRef.current = terminal.fitAddon
          currentPtyId.current = terminal.ptyId
          setTerminalPath(terminal.cwd)
          setSessionVersion((v) => v + 1)

          await new Promise((resolve) => requestAnimationFrame(resolve))
          try {
            terminal.fitAddon.fit()
            await window.api.pty.resize(terminal.ptyId, terminal.xterm.cols, terminal.xterm.rows)
          } catch {
            /* ignore */
          }
          terminal.xterm.focus()
        }
      })
    }
  }, [hasSelection, currentCwd, selectedWorktreeId, selectedRepoId, wtId, createTerminalInstance, activateSession])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyAllTerminals()
    }
  }, [destroyAllTerminals])

  // Handle window/container resize
  useEffect(() => {
    const handleResize = (): void => {
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit()
        } catch {
          /* ignore */
        }
      }
    }

    window.addEventListener('resize', handleResize)
    const observer = new ResizeObserver(handleResize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      observer.disconnect()
    }
  }, [])

  const handleSendCommand = useCallback((command: string) => {
    if (currentPtyId.current && command.trim()) {
      window.api.pty.write(currentPtyId.current, command + '\n')
    }
  }, [])

  const handleAppendToInput = useCallback((content: string, autoEnter: boolean) => {
    if (currentPtyId.current && content) {
      const ptyId = currentPtyId.current
      window.api.pty.write(ptyId, content)
      if (autoEnter) {
        setTimeout(() => {
          if (currentPtyId.current === ptyId) {
            window.api.pty.write(ptyId, '\r')
          }
        }, 50)
      }
    }
    xtermRef.current?.focus()
  }, [])

  const handleShowLog = useCallback(async () => {
    if (currentPtyId.current) {
      const buffer = await window.api.pty.getBuffer(currentPtyId.current)
      setLogBuffer(buffer)
    }
    setShowLogModal(true)
  }, [])

  const handleOpenInFinder = useCallback(() => {
    if (currentCwd) {
      window.api.app.openExternal('open', currentCwd)
    }
  }, [currentCwd])

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Terminal header bar */}
      {hasSelection && (
        <div className="flex h-9 items-center justify-between border-b border-border-muted bg-bg-primary px-3">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <TerminalSquare size={13} className="text-text-secondary" />
            <span className="max-w-[500px] truncate">{terminalPath}</span>
          </div>
          <button
            onClick={handleOpenInFinder}
            className="flex h-6 items-center gap-1.5 rounded-md px-2 text-[11px] text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
            title="在 Finder 中打开"
          >
            <FolderOpen size={12} />
            <span>Finder</span>
          </button>
        </div>
      )}

      {/* Session tabs bar */}
      {hasSelection && sessionCount > 0 && (
        <div className="flex h-7 items-center gap-0.5 border-b border-border-muted bg-bg-primary px-2">
          {currentGroup?.sessions.map((session, i) => {
            const isActive = i === activeSessionIndex
            const isEditing = editingTab?.wtId === wtId && editingTab?.index === i
            return (
              <div
                key={i}
                className={`group flex items-center gap-1 rounded px-2 py-0.5 text-xs cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-bg-elevated text-text-primary'
                    : 'text-text-muted hover:bg-bg-elevated hover:text-text-secondary'
                }`}
                onClick={() => !isEditing && handleSwitchSession(i)}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    className="w-20 rounded border border-border-muted bg-[#2a2a2a] px-1 text-xs text-[#e0e0e0] outline-none ring-1 ring-border-muted"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCommitEdit()
                      if (e.key === 'Escape') setEditingTab(null)
                    }}
                    onBlur={handleCommitEdit}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="max-w-[80px] truncate">{session.name}</span>
                    <span
                      className="invisible group-hover:visible flex items-center justify-center w-3 h-3 rounded-sm text-text-muted hover:text-text-primary"
                      onClick={(e) => wtId && handleStartEdit(e, wtId, i, session.name)}
                      title="重命名"
                    >
                      <Pencil size={9} />
                    </span>
                    <span
                      className={`flex items-center justify-center w-3 h-3 rounded-sm text-text-muted hover:text-text-primary ${sessionCount > 1 ? 'invisible group-hover:visible' : 'invisible pointer-events-none'}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (sessionCount > 1) handleCloseSession(i)
                      }}
                      title="关闭"
                    >
                      <X size={9} />
                    </span>
                  </>
                )}
              </div>
            )
          })}
          <button
            onClick={handleAddSession}
            className="flex items-center justify-center w-5 h-5 ml-0.5 rounded text-text-muted hover:bg-bg-elevated hover:text-text-secondary transition-colors"
            title="新建终端会话"
          >
            <Plus size={12} />
          </button>
        </div>
      )}

      {/* Terminal body */}
      <div className="relative flex-1 overflow-hidden">
        {hasSelection ? (
          <div ref={containerRef} className="relative h-full w-full bg-terminal-bg" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-text-muted">
            <TerminalSquare size={48} strokeWidth={1} />
            <p className="text-sm">选择一个仓库或 Worktree 开始</p>
            <p className="text-xs">左侧面板添加 Git 仓库，然后创建 Worktree</p>
          </div>
        )}
      </div>

      {/* Command input */}
      {showCommandInput && hasSelection && (
        <CommandInput onSend={handleSendCommand} onClose={() => setShowCommandInput(false)} />
      )}

      {/* Quick buttons bar — above the toolbar */}
      {hasSelection && <QuickButtonsBar onSend={handleAppendToInput} />}

      {/* Toolbar */}
      {hasSelection && (
        <TerminalToolbar
          showCommandInput={showCommandInput}
          onToggleCommandInput={() => setShowCommandInput(!showCommandInput)}
          onShowLog={handleShowLog}
        />
      )}

      {/* Log modal */}
      {showLogModal && (
        <TerminalLogModal
          buffer={logBuffer}
          terminalPath={terminalPath}
          onClose={() => setShowLogModal(false)}
        />
      )}
    </div>
  )
}
