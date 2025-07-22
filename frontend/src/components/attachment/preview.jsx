// AttachmentCard.jsx
import { cn } from "@/lib/utils";
import React, { useState } from "react";
import { Separator } from "../ui/separator";
import { FileText, Video, X } from "lucide-react";
import { ConfirmationDialog } from "../ui/ConfirmationDialog";
import { Label } from "../ui/label";
import { useDeleteFile } from "@/lib/useDeleteFile";

export function AttachmentPreview({
  attachments = [],
  max = 5,
  removeAttachment = () => {},
  className = "",
}) {
  // State for confirmation dialog and selected file for deletion
  const [isConfirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const { mutate: deleteFile } = useDeleteFile();

  // Helper to format file size
  const formatFileSize = (size) => {
    if (size < 1024) return size + " Bytes";
    if (size < 1024 * 1024) return (size / 1024).toFixed(1) + " KB";
    return (size / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Handle click on delete button: open confirmation dialog
  const handleDeleteClick = (file) => {
    setSelectedFile(file);
    setConfirmationDialogOpen(true);
  };

  // Handle confirmation dialog response
  const handleConfirmDeletion = () => {
    if (selectedFile) {
      deleteFile(selectedFile, {
        onSuccess: () => {
          removeAttachment(selectedFile);
          setSelectedFile(null);
        },
      });
    }
    setConfirmationDialogOpen(false);
    setSelectedFile(null);
  };

  const handleCancelDeletion = () => {
    setConfirmationDialogOpen(false);
    setSelectedFile(null);
  };

  return (
    <div className="space-y-4">
      <ConfirmationDialog
        isOpen={isConfirmationDialogOpen}
        onConfirm={handleConfirmDeletion}
        onCancel={handleCancelDeletion}
      />
      <Label>
        Attachments ({attachments.length}/{max})
      </Label>
      <Separator />
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4",
          className
        )}
      >
        {attachments.map((file, index) => (
          <div key={index} className="relative group border rounded-lg p-2">
            <button
              type="button"
              onClick={() => handleDeleteClick(file)}
              className="absolute -top-2 -right-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-3 w-3" />
            </button>
            <div className="aspect-square flex items-center justify-center bg-muted rounded">
              {file.type.startsWith("image/") ? (
                <img
                  src={file.url}
                  alt={file.filename}
                  className="h-full w-full object-cover rounded"
                />
              ) : file.type.startsWith("video/") ? (
                <Video className="h-8 w-8 text-muted-foreground" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs font-medium truncate" title={file.filename}>
                {file.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
