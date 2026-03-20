import { useState, useRef, useEffect } from 'react'
import { Send, X } from 'lucide-react'

interface CommandInputProps {
  onSend: (command: string) => void
  onClose: () => void
}

export function CommandInput({ onSend, onClose }: CommandInputProps): React.ReactElement {
  const [command, setCommand] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lineHeight = 20
    const maxLines = 3
    const newHeight = Math.min(el.scrollHeight, lineHeight * maxLines)
    el.style.height = `${newHeight}px`
  }, [command])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (command.trim()) {
        onSend(command)
        setCommand('')
      }
    }
  }

  return (
    <div className="border-t border-border bg-bg-primary">
      <div className="flex items-start gap-2 px-3 py-2">
        <span className="mt-1.5 font-mono text-sm text-accent">$</span>
        <textarea
          ref={textareaRef}
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入命令, Enter 发送, Shift+Enter 换行..."
          rows={1}
          className="flex-1 resize-none overflow-y-auto bg-transparent font-mono text-sm leading-5 text-text-primary placeholder-text-muted outline-none"
          style={{ minHeight: '20px', maxHeight: '60px' }}
        />
        <button
          onClick={() => {
            if (command.trim()) {
              onSend(command)
              setCommand('')
            }
          }}
          className="mt-0.5 rounded-full bg-accent p-1.5 text-white transition-colors hover:bg-accent-hover"
        >
          <Send size={13} />
        </button>
        <button
          onClick={onClose}
          className="mt-0.5 rounded p-1.5 text-text-muted transition-colors hover:text-text-secondary"
        >
          <X size={14} />
        </button>
      </div>
      <div className="px-3 pb-1.5 text-[10px] text-text-muted">
        Enter 发送, Shift+Enter 换行, Esc 关闭
      </div>
    </div>
  )
}
