import { useRef, useEffect, useCallback, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import '@xterm/xterm/css/xterm.css'
import { useRepoStore } from '../../stores/repoStore'
import { TerminalToolbar } from './TerminalToolbar'
import { CommandInput } from './CommandInput'
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

export function TerminalPanel(): React.ReactElement {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const currentPtyId = useRef<string | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const initializedRef = useRef(false)
  const lastCwdRef = useRef<string>('')
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

  const destroyTerminal = useCallback(async () => {
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (currentPtyId.current) {
      await window.api.pty.kill(currentPtyId.current)
      currentPtyId.current = null
    }
    if (xtermRef.current) {
      xtermRef.current.dispose()
      xtermRef.current = null
    }
    fitAddonRef.current = null
    initializedRef.current = false
    lastCwdRef.current = ''
  }, [])

  const createTerminal = useCallback(
    async (cwd: string) => {
      if (!terminalRef.current || !cwd) return

      const gen = ++generationRef.current
      await destroyTerminal()
      if (gen !== generationRef.current) return

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

      xterm.open(terminalRef.current)
      try {
        fitAddon.fit()
      } catch {
        /* initial fit may fail */
      }

      xtermRef.current = xterm
      fitAddonRef.current = fitAddon

      const ptyId = `pty-${Date.now()}`
      currentPtyId.current = ptyId

      await window.api.pty.create(ptyId, cwd)
      setTerminalPath(cwd)
      lastCwdRef.current = cwd

      xterm.onData((data) => window.api.pty.write(ptyId, data))
      xterm.onResize(({ cols, rows }) => window.api.pty.resize(ptyId, cols, rows))

      const removeDataListener = window.api.pty.onData(ptyId, (data) => xterm.write(data))
      const removeExitListener = window.api.pty.onExit(ptyId, () => {
        xterm.writeln('\r\n\x1b[33m终端会话已结束\x1b[0m')
      })

      cleanupRef.current = () => {
        removeDataListener()
        removeExitListener()
      }

      await window.api.pty.resize(ptyId, xterm.cols, xterm.rows)
      initializedRef.current = true
    },
    [destroyTerminal]
  )

  // Create terminal when first selecting a repo/worktree
  useEffect(() => {
    if (!hasSelection || !currentCwd) return

    if (!initializedRef.current) {
      createTerminal(currentCwd)
    } else if (currentCwd !== lastCwdRef.current && currentPtyId.current) {
      window.api.pty.write(currentPtyId.current, `cd "${currentCwd}" && clear\n`)
      setTerminalPath(currentCwd)
      lastCwdRef.current = currentCwd
    }
  }, [hasSelection, currentCwd, createTerminal])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyTerminal()
    }
  }, [destroyTerminal])

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
    if (terminalRef.current) {
      observer.observe(terminalRef.current)
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
          <div ref={terminalRef} className="h-full w-full bg-terminal-bg" />
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
