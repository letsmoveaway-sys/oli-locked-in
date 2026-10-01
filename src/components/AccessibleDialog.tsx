import { type ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface Props {
  titleId: string
  onClose: () => void
  busy?: boolean
  className?: string
  children: ReactNode
}

export function AccessibleDialog({ titleId, onClose, busy = false, className = '', children }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const root = document.getElementById('root')
    const previousHidden = root?.getAttribute('aria-hidden')
    root?.setAttribute('inert', '')
    root?.setAttribute('aria-hidden', 'true')
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('[autofocus], button, input, textarea, select, a[href]')?.focus(), 0)

    function keyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]'))
      const first = focusable[0]; const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', keyDown)
    return () => {
      document.removeEventListener('keydown', keyDown)
      root?.removeAttribute('inert')
      if (previousHidden === null || previousHidden === undefined) root?.removeAttribute('aria-hidden')
      else root?.setAttribute('aria-hidden', previousHidden)
      returnFocus?.focus()
    }
  }, [busy, onClose])

  return createPortal(<div className="modal-backdrop"><div aria-labelledby={titleId} aria-modal="true" className={className} ref={dialogRef} role="dialog">{children}</div></div>, document.body)
}
