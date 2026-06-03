import { type PropsWithChildren, useEffect, useRef } from 'react'

import { cn } from '@/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  className?: string
}

// Built on native <dialog>: closes on Escape, backdrop click, or programmatically.
export function Modal({
  open,
  onClose,
  title,
  description,
  className,
  children,
}: PropsWithChildren<ModalProps>) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handler = () => {
      if (open) onClose()
    }
    dialog.addEventListener('close', handler)
    return () => dialog.removeEventListener('close', handler)
  }, [open, onClose])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="modal-title"
      aria-describedby={description ? 'modal-desc' : undefined}
      onClick={(e) => {
        // Backdrop click: target equals the dialog only when clicking outside content.
        if (e.target === dialogRef.current) onClose()
      }}
      className={cn(
        'glass rounded-2xl p-6 max-w-md w-[92vw] text-ink shadow-card noise relative',
        'backdrop:bg-bg/70 backdrop:backdrop-blur-sm',
        'open:animate-in',
        className,
      )}
    >
      <header className="mb-4">
        <h2 id="modal-title" className="text-lg font-bold tracking-tight">
          {title}
        </h2>
        {description && (
          <p id="modal-desc" className="text-sm text-ink-muted mt-1">
            {description}
          </p>
        )}
      </header>
      {children}
    </dialog>
  )
}
