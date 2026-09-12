import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from './ui/alert-dialog';
import { useUiStore } from '../stores/useUiStore';

export function ConfirmModal() {
  const { confirmDialog, isConfirmDialogOpen, closeConfirmDialog } = useUiStore();
  const [loading, setLoading] = useState(false);

  if (!confirmDialog) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await confirmDialog.onConfirm();
      closeConfirmDialog();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog
      open={isConfirmDialogOpen}
      onOpenChange={(open) => {
        if (!open && !loading) closeConfirmDialog();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {confirmDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>
            {confirmDialog.cancelLabel || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={confirmDialog.variant || 'destructive'}
            disabled={loading}
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
          >
            {loading ? 'Processing…' : (confirmDialog.confirmLabel || 'Confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
