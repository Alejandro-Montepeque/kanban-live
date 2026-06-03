import { Button } from './Button'
import { Modal } from './Modal'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'primary'
  isPending?: boolean
}

// Branded replacement for native window.confirm — banned at the lint level.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  isPending = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          disabled={isPending}
          className={
            variant === 'danger'
              ? 'bg-gradient-to-b from-red-500 to-red-700 hover:shadow-[0_0_28px_rgba(239,68,68,0.45)] text-white'
              : undefined
          }
        >
          {isPending ? 'Working...' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
