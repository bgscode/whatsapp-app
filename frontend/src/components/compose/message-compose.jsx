"use client";

import { useState, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { format } from "date-fns";
import axios from "axios";
import { toast } from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Send, Calendar as CalendarIcon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// If you have the same `Attachment` and `AttachmentPreview` components:
import { Attachment } from "../attachment/upload";
import { AttachmentPreview } from "../attachment/preview";

// Query for templates
import { useGetTemplets } from "@/lib/query/templets/queryMutaion";
import { numberFormat } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings } from "@/lib/query/setting/queryMutation";

// Utility function if you need to parse JSON strings (e.g. for template attachments)
function jP(val) {
  try {
    return JSON.parse(val);
  } catch (err) {
    return [];
  }
}

// -------------- Main Form schema --------------
const formSchema = z.object({
  template: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  isScheduled: z.boolean().default(false),
  scheduledDate: z.date().optional().nullable(),
  scheduledTime: z.string().optional(),
});

/**
 * MessageComposeDialog
 *
 * @param {boolean} open - Whether the main compose dialog is open
 * @param {function} onOpenChange - Callback to close the main compose dialog
 * @param {boolean} [isSchedule=false] - If you want to default "Schedule" ON
 * @param {object} recipientData - Contains { headers: [], data: [] } for placeholders
 */
export function MessageComposeDialog({
  isSchedule = false,
  open,
  onOpenChange,
  recipientData = { headers: [], data: [] },
}) {
  // For attachments
  const [attachmentDocuments, setAttachmentDocuments] = useState([]);
  const [attachmentThumbnails, setAttachmentThumbnails] = useState([]);
  const quryClient = useQueryClient();

  // For the second “Schedule Name” dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const { data: settData } = useGetSettings();
  const country_code = settData?.selectedCountry?.phone[0];

  const textareaRef = useRef(null);

  // Templates from your backend
  const { data: tempData } = useGetTemplets();
  const templates = tempData?.templets || [];

  // Set up the form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template: "",
      message: "",
      isScheduled: isSchedule,
      scheduledDate: null,
      scheduledTime: "12:00",
    },
  });

  // Whether scheduling is ON
  const isScheduled = form.watch("isScheduled");

  // ----------------- Handler for template selection -----------------
  const handleTemplateChange = (templateId) => {
    form.setValue("template", templateId);
    const found = templates.find((t) => `${t.id}` === templateId);
    if (!found) return;

    // 1. Set message text
    form.setValue("message", found?.message || "");

    // 2. If the template has attachments
    let docArr = jP(found?.attachment_document);
    let thumbArr = jP(found?.attachment_thumbnail);

    setAttachmentDocuments(Array.isArray(docArr) ? docArr : []);
    setAttachmentThumbnails(Array.isArray(thumbArr) ? thumbArr : []);
  };

  // ----------------- Insert placeholder at cursor -----------------
  const insertFieldToMessage = (field) => {
    const fieldTag = `{{${field}}}`;
    const currentMessage = form.getValues("message") || "";

    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const updated =
        currentMessage.substring(0, start) +
        fieldTag +
        currentMessage.substring(end);
      form.setValue("message", updated);

      // Move cursor after inserted field
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = start + fieldTag.length;
          textareaRef.current.selectionEnd = start + fieldTag.length;
        }
      }, 0);
    } else {
      form.setValue("message", currentMessage + fieldTag);
    }
  };

  // ----------------- Attachment Handlers -----------------
  const handleSetAttachment = (file, type) => {
    if (type === "document") {
      setAttachmentDocuments((prev) => [...prev, file]);
    } else {
      setAttachmentThumbnails((prev) => [...prev, file]);
    }
  };

  const removeAttachment = (curr) => {
    setAttachmentDocuments((prev) => prev.filter((f) => f.path !== curr.path));
    setAttachmentThumbnails((prev) => prev.filter((f) => f.path !== curr.path));
  };

  // ----------------- Build Bulk Payload -----------------
  const buildBulkPayload = (formValues, scheduleName) => {
    const { message } = formValues;
    const bulkMessages = [];

    if (!recipientData?.data || recipientData.data.length === 0) {
      return [];
    }

    for (const row of recipientData.data) {
      let personalized = message;
      if (Array.isArray(recipientData.headers)) {
        recipientData.headers.forEach((header) => {
          const pattern = new RegExp(`{{${header}}}`, "g");
          personalized = personalized.replace(pattern, row[header] || "");
        });
      }

      // Each row
      const finalObj = {
        shedule_name: scheduleName || "Scheduled Message",
        whatsapp_no:
          row.contact_type !== "individual"
            ? row["whatsapp_no"]
            : numberFormat(row["whatsapp_no"], country_code),
        contact_type: row.contact_type || "individual",
        message: personalized,
        attachment_thumbnail: attachmentThumbnails,
        attachment_document: attachmentDocuments,
      };
      bulkMessages.push(finalObj);
    }
    console.log("Bulk Messages:", bulkMessages);
    return bulkMessages;
  };

  // ----------------- onSubmit for immediate or scheduled -----------
  const onSubmit = async (formValues) => {
    // If user toggles scheduling ON, we open schedule name dialog
    if (formValues.isScheduled) {
      setScheduleDialogOpen(true); // open the second dialog
    } else {
      // If scheduling is OFF => do immediate send
      await handleSendBulk(formValues, "");
    }
  };

  // Actually do the immediate “bulk-send”
  const handleSendBulk = async (formValues, scheduleName) => {
    try {
      const bulkMessages = buildBulkPayload(formValues, scheduleName);
      if (bulkMessages.length === 0) {
        toast.error("No recipients found or no messages to send.");
        return;
      }

      // Post them to /bulk-send
      await axios.post("http://localhost:5000/bulk-send", {
        bulkMessages,
      });

      toast.success("Bulk messages queued for sending!");
      // Reset
      form.reset();
      setAttachmentDocuments([]);
      setAttachmentThumbnails([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSendBulk:", error);
      toast.error("Error sending messages.");
    }
  };

  // Actually do the “scheduled” bulk
  const handleScheduleBulk = async (formValues, scheduleName) => {
    try {
      const bulkMessages = buildBulkPayload(formValues, scheduleName);
      if (bulkMessages.length === 0) {
        toast.error("No recipients found or no messages to schedule.");
        return;
      }

      // Convert them to the shape expected by /scheduled
      const schedules = bulkMessages.map((msg) => ({
        shedule_name: msg.shedule_name,
        whatsapp_no: msg.whatsapp_no,
        contact_type: msg.contact_type,
        message: msg.message,
        attachment_thumbnail: msg.attachment_thumbnail || [],
        attachment_document: msg.attachment_document || [],
        schedule_date: formValues.scheduledDate
          ? format(formValues.scheduledDate, "yyyy-MM-dd")
          : "",
        schedule_time: formValues.scheduledTime || "00:00",
      }));

      await axios.post("http://localhost:5000/scheduled", {
        schedules,
      });

      quryClient.invalidateQueries("scheduled");
      toast.success("Messages scheduled successfully!");

      // Reset
      form.reset();
      setAttachmentDocuments([]);
      setAttachmentThumbnails([]);
      onOpenChange(false);
    } catch (error) {
      console.error("Error scheduling messages:", error);
      toast.error("Error scheduling messages.");
    }
  };

  // ------------- Render -------------
  return (
    <>
      {/* Main Compose Dialog */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-3xl max-h-[calc(100vh-4rem)] overflow-y-auto 
                    [&::-webkit-scrollbar]:w-2
                    [&::-webkit-scrollbar-track]:bg-muted/50
                    [&::-webkit-scrollbar-thumb]:rounded-full
                    [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30"
        >
          <DialogHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold">
                Compose Message
              </DialogTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Schedule</span>
                <Switch
                  checked={isScheduled}
                  onCheckedChange={(checked) =>
                    form.setValue("isScheduled", checked)
                  }
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {isScheduled
                ? "Schedule a message to be sent at a specific date and time"
                : "Create your message to send immediately"}
            </p>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid gap-5 py-4"
            >
              {/* Template Selector */}
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel className="font-medium">Template</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleTemplateChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select a template to use" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={`${tpl.id}`}>
                            {tpl.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fields (Placeholders) */}
              <div className="grid gap-2">
                <Label className="font-medium">Available Fields</Label>
                <div className="flex flex-wrap gap-2 border rounded-md p-3 bg-muted/10 min-h-14">
                  {recipientData?.headers?.length > 0 ? (
                    recipientData.headers.map((header) => (
                      <Badge
                        key={header}
                        variant="outline"
                        className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/25 cursor-pointer transition-colors"
                        onClick={() => insertFieldToMessage(header)}
                      >
                        {header}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No fields available
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click on a field to insert it as a placeholder in your
                  message.
                </p>
              </div>

              {/* Message Textarea */}
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem className="grid gap-2">
                    <FormLabel className="font-medium">Message</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Textarea
                          {...field}
                          ref={(el) => {
                            field.ref(el);
                            textareaRef.current = el;
                          }}
                          placeholder="Type your message here. Use {{field}} placeholders for personalization."
                          className="min-h-[150px] resize-y p-3"
                        />
                      </FormControl>
                      <Attachment
                        max={5}
                        totalAttachment={
                          attachmentDocuments.length +
                          attachmentThumbnails.length
                        }
                        setAttachment={handleSetAttachment}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* If scheduling is ON, show date/time fields */}
              {isScheduled && (
                <div className="grid gap-5 p-4 border rounded-md bg-accent/5">
                  <Label className="font-medium text-primary">
                    Schedule Options
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date */}
                    <FormField
                      control={form.control}
                      name="scheduledDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal h-10"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value
                                    ? format(field.value, "PPP")
                                    : "Select a date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                initialFocus
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Time */}
                    <FormField
                      control={form.control}
                      name="scheduledTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} className="h-10" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* AttachmentPreview */}
              <AttachmentPreview
                attachments={[...attachmentDocuments, ...attachmentThumbnails]}
                removeAttachment={removeAttachment}
              />

              {/* Footer: Recipients count & Submit button */}
              <div className="flex items-center justify-between mt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Recipients:</span>
                  <Badge variant="secondary" className="ml-2">
                    {recipientData?.data?.length || 0}
                  </Badge>
                </div>
                <Button
                  type="submit"
                  className="bg-primary hover:bg-primary/90"
                  disabled={
                    isScheduled &&
                    (!form.getValues("scheduledDate") ||
                      !form.getValues("scheduledTime"))
                  }
                >
                  {isScheduled ? (
                    <>
                      <CalendarIcon className="h-4 w-4 mr-2" /> Schedule Message
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" /> Send Message
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* SECOND DIALOG: "Schedule Name" */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Name Your Schedule</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Give your scheduled messages a recognizable name
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label>Schedule Name</Label>
            <Input
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
              placeholder="e.g. Holiday Campaign"
              className="h-10"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              This helps you identify this schedule in your dashboard
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!scheduleName.trim()) {
                  toast.error("Please provide a schedule name");
                  return;
                }
                // Values from the main form
                const vals = form.getValues();
                await handleScheduleBulk(vals, scheduleName.trim());
                setScheduleName("");
                setScheduleDialogOpen(false);
              }}
              className="bg-primary hover:bg-primary/90"
            >
              Confirm Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
