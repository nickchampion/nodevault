'use client'

import { AlertDialog, Button } from '@heroui/react'
import type { ReactNode } from 'react'

type ConfirmDialogProperties = {
  isOpen: boolean
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  isConfirming?: boolean
  onOpenChangeAction: (isOpen: boolean) => void
  onConfirmAction: () => void
}

/** Generic destructive-action confirmation dialog — controlled, so callers own the open state. */
export const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isConfirming = false,
  onOpenChangeAction,
  onConfirmAction,
}: ConfirmDialogProperties) => (
  <AlertDialog
    isOpen={isOpen}
    onOpenChange={onOpenChangeAction}
  >
    <AlertDialog.Backdrop>
      <AlertDialog.Container>
        <AlertDialog.Dialog>
          <AlertDialog.Header>
            <AlertDialog.Icon />
            <AlertDialog.Heading>{title}</AlertDialog.Heading>
          </AlertDialog.Header>

          <AlertDialog.Body>{description}</AlertDialog.Body>

          <AlertDialog.Footer>
            <Button
              variant="secondary"
              isDisabled={isConfirming}
              onPress={() => onOpenChangeAction(false)}
            >
              {cancelLabel}
            </Button>

            <Button
              variant="danger"
              isPending={isConfirming}
              onPress={onConfirmAction}
            >
              {confirmLabel}
            </Button>
          </AlertDialog.Footer>
        </AlertDialog.Dialog>
      </AlertDialog.Container>
    </AlertDialog.Backdrop>
  </AlertDialog>
)
