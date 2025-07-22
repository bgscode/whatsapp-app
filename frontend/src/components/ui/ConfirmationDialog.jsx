import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * ConfirmationDialog component renders a dialog with a title, description, and confirm/cancel buttons.
 *
 * @param {Object} props - The properties object.
 * @param {string} props.title - The title of the dialog.
 * @param {string} props.description - The description text of the dialog.
 * @param {string} [props.confirmText="Confirm"] - The text for the confirm button.
 * @param {boolean} props.isOpen - A boolean indicating whether the dialog is open.
 * @param {Function} props.onConfirm - The function to call when the confirm button is clicked.
 * @param {Function} props.onCancel - The function to call when the cancel button is clicked or the dialog is closed.
 * @returns {JSX.Element} The rendered ConfirmationDialog component.
 */

export function ConfirmationDialog({
  title = "Are you absolutely sure?",
  description = "This action cannot be undone. This will permanently delete your file remove your data from the system.",
  confirmText = "Yes, delete",
  isOpen,
  onConfirm,
  onCancel,
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>{confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
