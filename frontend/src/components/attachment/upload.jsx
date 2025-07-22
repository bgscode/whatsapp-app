import React, { useState, useRef } from "react";
import { FileText, ImageIcon, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpload } from "@/lib/useUpload";
import toast from "react-hot-toast";

export function Attachment({
  setAttachment = (file, type) => console.log(file, type),
  totalAttachment,
  max = 5,
}) {
  const imageRef = useRef(null);
  const documentRef = useRef(null);
  const [type, setType] = useState("");

  // File upload method from your hook
  const { mutate: uploadFile } = useUpload();

  // Handler for file input changes
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (totalAttachment >= max) {
      toast.error("You can only attach up to 5 files");
      return;
    }

    uploadFile(file, {
      onSuccess: (uploadedData) => {
        setAttachment(uploadedData, type);
      },
      onError: (error) => {
        toast.error("Failed to upload file");
      },
    });
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // Trigger the file input after setting the correct accept attribute
  const handleButtonClick = (type) => {
    if (type === "image&video") {
      setType("image&video");
      imageRef.current.click();
    } else if (type === "document") {
      setType("document");
      documentRef.current.click();
    }
  };

  return (
    <>
      <div
        className="absolute bottom-2 right-2 flex items-center gap-2"
        title="Attach file"
      >
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="end" side="top">
            <div className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start text-sm px-2 h-8"
                onClick={() => handleButtonClick("image&video")}
              >
                <ImageIcon className="mr-2 h-4 w-4" /> Images & Videos
              </Button>
              <Button
                variant="ghost"
                className="justify-start text-sm px-2 h-8"
                onClick={() => handleButtonClick("document")}
              >
                <FileText className="mr-2 h-4 w-4" /> Document
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={imageRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />
      {/* Hidden file Input */}
      <input
        type="file"
        ref={documentRef}
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}
