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
import { TerminalSquare, FolderOpen } from 'lucide-react'

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
}

export function TerminalPanel(): React.ReactElement {
  // 所有 worktree 终端共用的父容器，各终端在其中拥有独立的子 div
  const containerRef = useRef<HTMLDivElement>(null)
  // 当前激活的 xterm ref（用于事件绑定和操作）
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentPtyId = useRef<string | null>(null)
  // 存储每个 worktree 的独立终端
  const worktreeTerminals = useRef(new Map<string, WorktreeTerminal>())
  const currentWorktreeId = useRef<string | null>(null)
  const generationRef = useRef(0)

  const [showCommandInput, setShowCommandInput] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [terminalPath, setTerminalPath] = useState('')
  const [logBuffer, setLogBuffer] = useState('')

  const selectedRepoId = useRepoStore((s) => s.selectedRepoId)
  const selectedWorktreeId = useRepoStore((s) => s.selectedWorktreeId)
  const repos = useRepoStore((s) => s.repos)

  const selectedRepo = repos.find((r) => r.id === selectedRepoId)
  const selectedWorktree = selectedRepo?.worktrees.find((w) => w.id === selectedWorktreeId)
  const currentCwd = selectedWorktree?.path || selectedRepo?.path || ''
  const hasSelection = selectedRepo !== undefined

  const destroyAllTerminals = useCallback(async () => {
    for (const [, terminal] of worktreeTerminals.current) {
      terminal.cleanup()
      await window.api.pty.kill(terminal.ptyId)
      terminal.xterm.dispose()
      terminal.element.remove()
    }
    worktreeTerminals.current.clear()
    xtermRef.current = null
    fitAddonRef.current = null
    currentPtyId.current = null
    currentWorktreeId.current = null
  }, [])

  const destroyTerminalForWorktree = useCallback(async (wtId: string) => {
    const terminal = worktreeTerminals.current.get(wtId)
    if (terminal) {
      terminal.cleanup()
      await window.api.pty.kill(terminal.ptyId)
      terminal.xterm.dispose()
      terminal.element.remove()
      worktreeTerminals.current.delete(wtId)
    }
  }, [])

  const createTerminalForWorktree = useCallback(
    async (wtId: string, cwd: string): Promise<WorktreeTerminal | null> => {
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
        fontWeightBold: 'bold'
      })

      const fitAddon = new FitAddon()
      xterm.loadAddon(fitAddon)
      xterm.loadAddon(new WebLinksAddon())
      xterm.loadAddon(new SearchAddon())

      const ptyId = `pty-${wtId}-${Date.now()}`

      await window.api.pty.create(ptyId, cwd)

      if (gen !== generationRef.current) {
        await window.api.pty.kill(ptyId)
        return null
      }

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

      // 每个 worktree 终端拥有独立的 DOM 容器，xterm.open() 只调用一次
      // 切换终端时只改变 display，不重新调用 open()
      const element = document.createElement('div')
      element.style.cssText = 'position: absolute; inset: 0; display: none;'
      containerRef.current.appendChild(element)

      xterm.open(element)
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

      return { xterm, ptyId, cleanup, cwd, fitAddon, element }
    },
    []
  )

  const switchToTerminal = useCallback(async (wtId: string, terminal: WorktreeTerminal) => {
    // 如果已经是当前终端，不需要切换
    if (currentWorktreeId.current === wtId) return

    // 隐藏所有终端容器，只显示目标终端的容器
    // 不重新调用 xterm.open()，避免内部 DOM 引用错乱
    for (const [, t] of worktreeTerminals.current) {
      t.element.style.display = 'none'
    }
    terminal.element.style.display = 'block'

    try {
      terminal.fitAddon.fit()
    } catch {
      /* ignore */
    }

    // 更新当前引用
    xtermRef.current = terminal.xterm
    fitAddonRef.current = terminal.fitAddon
    currentPtyId.current = terminal.ptyId
    currentWorktreeId.current = wtId
    setTerminalPath(terminal.cwd)

    // 触发 resize 以适应
    await window.api.pty.resize(terminal.ptyId, terminal.xterm.cols, terminal.xterm.rows)
  }, [])

  // Handle worktree/repo selection and terminal switching
  useEffect(() => {
    if (!hasSelection || !currentCwd) return

    // 确定当前 worktree 的唯一标识
    const wtId = selectedWorktreeId || `repo-${selectedRepoId}`

    // 检查是否已有该 worktree 的终端
    if (worktreeTerminals.current.has(wtId)) {
      // 切换到已有终端
      const terminal = worktreeTerminals.current.get(wtId)!
      switchToTerminal(wtId, terminal)
    } else {
      // 创建新终端
      createTerminalForWorktree(wtId, currentCwd).then((terminal) => {
        if (terminal) {
          // 隐藏其他终端，显示新创建的终端
          for (const [, t] of worktreeTerminals.current) {
            t.element.style.display = 'none'
          }
          terminal.element.style.display = 'block'

          // 创建成功后存入 Map 并更新当前工作目录
          worktreeTerminals.current.set(wtId, terminal)
          currentWorktreeId.current = wtId
          xtermRef.current = terminal.xterm
          fitAddonRef.current = terminal.fitAddon
          currentPtyId.current = terminal.ptyId
          setTerminalPath(terminal.cwd)
        }
      })
    }
  }, [hasSelection, currentCwd, selectedWorktreeId, selectedRepoId, createTerminalForWorktree, switchToTerminal])

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

  // 快捷按钮：追加内容到终端当前输入行，autoEnter 为 true 时附加换行符执行
  const handleAppendToInput = useCallback((content: string, autoEnter: boolean) => {
    if (currentPtyId.current && content) {
      window.api.pty.write(currentPtyId.current, autoEnter ? content + '\n' : content)
    }
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
