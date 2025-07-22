"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import axios from "axios";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { Virtuoso } from "react-virtuoso";
import {
  CalendarIcon,
  Clock,
  FileSpreadsheet,
  PlusCircle,
  Search,
  Send,
  Trash2,
  Users,
  UserPlus,
  MessagesSquare,
  Smartphone,
  FileText,
  UploadCloud,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Attachment } from "@/components/attachment/upload";
import { AttachmentPreview } from "@/components/attachment/preview";
import { useGetTemplets } from "@/lib/query/templets/queryMutaion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateScheduledMessage } from "@/lib/query/scheduled/queryMutaion";
import { jP, numberFormat } from "@/lib/utils";
import readCSVAndExcel from "@/lib/readCsv&Excel";
import { useGetSettings } from "@/lib/query/setting/queryMutation";

const formSchema = z.object({
  template: z.string().optional(),
  message: z.string().min(1, "Message is required"),
  scheduledDate: z.date().optional().nullable(),
  scheduledTime: z.string().optional(),
});

export default function ComposeMessage() {
  // State declarations
  const [contactSearchTerm, setContactSearchTerm] = useState("");
  const [contactHeader, setContactHeader] = useState(["whatsapp_no", "name"]);
  const [contactData, setContactData] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [attachmentThumbnail, setAttachmentThumbnail] = useState([]);
  const [attachmentDocument, setAttachmentDocument] = useState([]);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [quickAddDialogOpen, setQuickAddDialogOpen] = useState(false);
  const [recipientRows, setRecipientRows] = useState([
    { name: "", whatsapp_no: "" },
  ]);
  const textareaRef = useRef(null);
  const { data: settData } = useGetSettings();
  const country_code = settData?.selectedCountry?.phone[0];
  const { data: tempData } = useGetTemplets();
  const templates = tempData?.templets || [];

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      template: "",
      message: "",
      scheduledDate: null,
      scheduledTime: "",
    },
  });

  // Initialize recipient rows when Quick Add dialog opens
  useEffect(() => {
    if (quickAddDialogOpen) {
      setRecipientRows([{ name: "", whatsapp_no: "" }]);
    }
  }, [quickAddDialogOpen, setRecipientRows]);

  // Filter contacts based on search term
  const filteredContacts = contactData.filter((contact) => {
    const lowerTerm = contactSearchTerm.toLowerCase();
    const nameVal = (contact.name || "").toLowerCase();
    const numberVal = contact["whatsapp_no"] || contact.whatsapp_no || "";
    return nameVal.includes(lowerTerm) || numberVal.includes(contactSearchTerm);
  });

  // Template change handler
  const handleTemplateChange = (templateId) => {
    form.setValue("template", templateId);
    const template = templates.find((t) => `${t.id}` === templateId);
    if (template) {
      form.setValue("message", template.message || "");
      const attchmentDoc = jP(template.attachment_document);
      const attchmentThumb = jP(template.attachment_thumbnail);
      if (attchmentDoc?.length) setAttachmentDocument(attchmentDoc);
      if (attchmentThumb?.length) setAttachmentThumbnail(attchmentThumb);
    }
  };

  // Insert placeholder field into message
  const insertFieldToMessage = (field) => {
    const fieldTag = `{{${field}}}`;
    const message = form.getValues("message") || "";
    if (textareaRef.current) {
      const { selectionStart: start, selectionEnd: end } = textareaRef.current;
      const newMessage =
        message.slice(0, start) + fieldTag + message.slice(end);
      form.setValue("message", newMessage);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = start + fieldTag.length;
          textareaRef.current.selectionEnd = start + fieldTag.length;
        }
      }, 0);
    } else {
      form.setValue("message", message + fieldTag);
    }
  };

  // Attachment handlers
  const handleSetAttachment = (file, type) => {
    if (type === "document") {
      setAttachmentDocument((prev) => [...prev, file]);
    } else {
      setAttachmentThumbnail((prev) => [...prev, file]);
    }
  };

  const removeAttachment = (curr) => {
    setAttachmentDocument((prev) =>
      prev.filter((file) => file.path !== curr.path)
    );
    setAttachmentThumbnail((prev) =>
      prev.filter((file) => file.path !== curr.path)
    );
  };

  // CSV/Excel upload handler
  const handleCSVUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx";
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      toast.loading("Importing contacts...", { id: "import-contacts" });

      try {
        const response = await readCSVAndExcel(file, ["whatsapp_no"]);
        if (response) {
          setContactData(response.data);
          setContactHeader(response.headers);
          toast.success(
            `Imported ${response.data.length} contacts successfully!`,
            { id: "import-contacts" }
          );
        }
      } catch (error) {
        console.error("Import error:", error);
        toast.error(
          "Failed to import contacts. Please check your file format.",
          { id: "import-contacts" }
        );
      }
    };
    input.click();
  };

  // Recipient rows management
  const handleRecipientChange = (index, field, value) => {
    setRecipientRows((prev) => {
      const updated = [...prev];
      updated[index][field] = value;
      // Auto-generate a new row when whatsapp_no reaches 7 digits on the last row
      if (
        field === "whatsapp_no" &&
        value.length === 7 &&
        index === prev.length - 1
      ) {
        updated.push({ name: "", whatsapp_no: "" });
      }
      return updated;
    });
  };

  const handleDeleteRecipientRow = (index) => {
    if (recipientRows.length <= 1) return;
    setRecipientRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImportRecipients = () => {
    const validRecipients = recipientRows.filter((row) =>
      row.whatsapp_no.trim()
    );
    if (!validRecipients.length) {
      toast.error("Please add at least one valid WhatsApp number");
      return;
    }
    const newContacts = validRecipients.map((row) => ({
      whatsapp_no: row.whatsapp_no,
      name: row.name || "Unknown",
    }));
    setContactData((prev) => [...prev, ...newContacts]);
    const newPhoneNumbers = validRecipients.map((row) => row.whatsapp_no);
    setSelectedContacts((prev) =>
      Array.from(new Set([...prev, ...newPhoneNumbers]))
    );
    setQuickAddDialogOpen(false);
    toast.success(`Added ${validRecipients.length} new recipient(s)`);
  };

  // Render each contact row for the virtualized list
  const renderContactRow = useCallback(
    (index) => {
      const contact = filteredContacts[index];
      const phoneVal = contact["whatsapp_no"] || contact.whatsapp_no;
      const nameVal = contact.name;
      const isChecked = selectedContacts.includes(phoneVal);
      return (
        <div
          key={`row-${index}`}
          className="flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border/40 last:border-0"
        >
          <Checkbox
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (checked) {
                setSelectedContacts((prev) => [...prev, phoneVal]);
              } else {
                setSelectedContacts((prev) =>
                  prev.filter((num) => num !== phoneVal)
                );
              }
            }}
            className="h-5 w-5"
          />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{nameVal || "Unknown"}</div>
            <div className="text-sm text-muted-foreground">{phoneVal}</div>
          </div>
        </div>
      );
    },
    [filteredContacts, selectedContacts]
  );

  // Generate bulk payload for sending messages
  const generateBulkPayload = (formValues) => {
    return selectedContacts.map((contactNum) => {
      const matchedContact = contactData.find(
        (c) => c["whatsapp_no"] === contactNum || c.whatsapp_no === contactNum
      );
      let personalizedMessage = formValues.message;
      if (matchedContact) {
        Object.entries(matchedContact).forEach(([key, val]) => {
          const pattern = new RegExp(`{{${key}}}`, "g");
          personalizedMessage = personalizedMessage.replace(pattern, val || "");
        });
      }
      return {
        name: matchedContact?.name,
        whatsapp_no: numberFormat(contactNum, country_code),
        contact_type: "individual",
        message: personalizedMessage,
        attachment_thumbnail: attachmentThumbnail,
        attachment_document: attachmentDocument,
      };
    });
  };

  // Immediate bulk send handler
  const handleSendBulk = async (values) => {
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected! Please select recipients first.");
      return;
    }
    try {
      toast.loading("Sending messages...", { id: "send-messages" });
      const bulkMessages = generateBulkPayload(values);
      await axios.post("http://localhost:5000/bulk-send", { bulkMessages });
      toast.success(`${selectedContacts.length} messages queued for sending!`, {
        id: "send-messages",
      });
      form.reset();
      setAttachmentDocument([]);
      setAttachmentThumbnail([]);
      setSelectedContacts([]);
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      toast.error(
        "An error occurred while sending messages. Please try again.",
        { id: "send-messages" }
      );
    }
  };

  // Schedule bulk send handler
  const { mutate: bulkSchedule } = useCreateScheduledMessage();
  const handleScheduleBulk = () => {
    const values = form.getValues();
    if (selectedContacts.length === 0) {
      toast.error("No contacts selected! Please select recipients first.");
      return;
    }
    if (!scheduleName.trim()) {
      toast.error("Please provide a schedule name");
      return;
    }
    const bulkMessages = generateBulkPayload(values);
    const schedules = bulkMessages.map((item) => ({
      shedule_name: scheduleName,
      whatsapp_no: item.whatsapp_no,
      contact_type: "individual",
      message: item.message,
      attachment_thumbnail: item.attachment_thumbnail,
      schedule_date: values.scheduledDate
        ? format(values.scheduledDate, "yyyy-MM-dd")
        : "",
      schedule_time: values.scheduledTime || "00:00",
    }));

    toast.loading("Scheduling messages...", { id: "schedule-messages" });

    bulkSchedule(
      { schedules },
      {
        onSuccess: () => {
          toast.success(
            `${schedules.length} messages scheduled successfully!`,
            { id: "schedule-messages" }
          );
          setScheduleDialogOpen(false);
          setScheduleName("");
          form.reset();
          setAttachmentDocument([]);
          setAttachmentThumbnail([]);
          setSelectedContacts([]);
        },
        onError: (error) => {
          console.error("Scheduling error:", error);
          toast.error("Failed to schedule messages. Please try again.", {
            id: "schedule-messages",
          });
        },
      }
    );
  };

  return (
    <div className="bg-background">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Compose Message</h2>
        <p className="text-muted-foreground">
          Create and send WhatsApp messages to multiple recipients
        </p>
      </div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Left Section: Compose */}
        <Card className="overflow-hidden border-t-4 border-t-primary shadow-sm">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="w-5 h-5 text-primary" />
              Compose Your Message
            </CardTitle>
            <CardDescription>
              Create your message with personalization fields
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6">
            <Form {...form}>
              <div className="space-y-5">
                {/* Template Selector */}
                <FormField
                  control={form.control}
                  name="template"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-base">Template</FormLabel>
                        <Badge variant="outline" className="font-normal">
                          {templates.length} Templates
                        </Badge>
                      </div>
                      <Select
                        value={field.value}
                        onValueChange={handleTemplateChange}
                      >
                        <FormControl>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Choose a template or compose from scratch" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No templates available
                            </SelectItem>
                          ) : (
                            templates.map((tpl) => (
                              <SelectItem key={tpl.id} value={`${tpl.id}`}>
                                {tpl.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Personalization Fields */}
                <div className="space-y-2">
                  <Label className="text-base">Personalization Fields</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
                    {contactHeader.map((header) => (
                      <Badge
                        key={header}
                        variant="outline"
                        className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 transition-all"
                        onClick={() => insertFieldToMessage(header)}
                      >
                        {header}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click on a field to insert it as{" "}
                    <code className="bg-muted px-1 rounded text-xs">
                      {"{{field}}"}
                    </code>{" "}
                    in your message
                  </p>
                </div>

                {/* Message Area */}
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-base">
                        Message Content
                      </FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Textarea
                            ref={(e) => {
                              field.ref(e);
                              textareaRef.current = e;
                            }}
                            placeholder="Type your message here. Use {{name}} or {{whatsapp_no}} for personalization."
                            value={field.value}
                            onChange={field.onChange}
                            className="min-h-[180px] resize-y pt-2 pb-10 text-base"
                          />
                        </FormControl>
                        <div className="absolute bottom-2 right-2">
                          <Attachment
                            totalAttachment={
                              attachmentDocument.length +
                              attachmentThumbnail.length
                            }
                            setAttachment={handleSetAttachment}
                            max={5}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Attachments Preview */}
                <AttachmentPreview
                  attachments={[...attachmentThumbnail, ...attachmentDocument]}
                  removeAttachment={removeAttachment}
                />

                {/* Schedule Options */}
                <div className="grid gap-4 sm:grid-cols-2 border rounded-lg p-4 bg-muted/10">
                  <div className="sm:col-span-2 mb-1">
                    <Label className="text-base">Schedule (Optional)</Label>
                    <p className="text-sm text-muted-foreground">
                      Set a date and time to send this message later
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="scheduledDate"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-11"
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(field.value, "MMM dd, yyyy")
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

                  <FormField
                    control={form.control}
                    name="scheduledTime"
                    render={({ field }) => (
                      <FormItem className="grid gap-2">
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            value={field.value}
                            onChange={field.onChange}
                            className="h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between items-center border-t bg-muted/10 py-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                Selected: {selectedContacts.length} recipient
                {selectedContacts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-x-3 w-full sm:w-auto flex sm:block">
              <Button
                type="button"
                onClick={() => handleSendBulk(form.getValues())}
                className="gap-2 flex-1 sm:flex-none"
                size="lg"
              >
                <Send className="w-4 h-4" />
                Send Now
              </Button>
              <Button
                variant="outline"
                type="button"
                className="gap-2 flex-1 sm:flex-none"
                size="lg"
                onClick={() => {
                  if (selectedContacts.length === 0) {
                    toast.error("No contacts selected!");
                    return;
                  }
                  if (!form.getValues("message")) {
                    toast.error("Please enter a message!");
                    return;
                  }
                  if (!form.getValues("scheduledDate")) {
                    toast.error("Please select a date for scheduling!");
                    return;
                  }
                  if (!form.getValues("scheduledTime")) {
                    toast.error("Please select a time for scheduling!");
                    return;
                  }

                  setScheduleDialogOpen(true);
                }}
              >
                <Clock className="w-4 h-4" />
                Schedule
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Right Section: Recipients */}
        <div className="space-y-5">
          <Card className="shadow-sm border-t-4 border-t-green-500">
            <CardHeader className="bg-muted/30">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-green-500" />
                    Recipients
                  </CardTitle>
                  <CardDescription>
                    Select contacts or import from file
                  </CardDescription>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuickAddDialogOpen(true)}
                        className="rounded-full h-9 w-9 bg-green-500/10 hover:bg-green-500/20 text-green-600"
                      >
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add new contacts</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* Search & Import */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contacts..."
                      value={contactSearchTerm}
                      onChange={(e) => setContactSearchTerm(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={handleCSVUpload}
                        >
                          <UploadCloud className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        Import contacts from CSV/Excel
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Import Info */}
                <div className="flex justify-between items-center py-2 px-3 bg-muted/30 rounded-lg text-sm">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Import contacts from file</span>
                  </div>
                  <a
                    className="text-sm text-primary hover:text-primary/80 hover:underline"
                    href="/sample_contacts.csv"
                    download
                  >
                    Download Template
                  </a>
                </div>

                {/* Contact List */}
                {contactData.length === 0 ? (
                  <div className="text-center py-10 px-4 border border-dashed rounded-lg">
                    <Users className="mx-auto h-10 w-10 text-muted-foreground/60 mb-3" />
                    <h3 className="text-lg font-medium">No contacts yet</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Import contacts from a file or add them manually
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCSVUpload}
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-2" /> Import File
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setQuickAddDialogOpen(true)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" /> Add Manually
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="flex justify-between items-center py-2 px-3 bg-muted/50 border-b">
                      <div className="text-sm font-medium">
                        Select Recipients
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {filteredContacts.length} contact
                        {filteredContacts.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <Virtuoso
                      totalCount={filteredContacts.length}
                      style={{ height: "350px" }}
                      className="overflow-y-auto
                        [&::-webkit-scrollbar]:w-2
                        [&::-webkit-scrollbar-track]:rounded-full
                        [&::-webkit-scrollbar-track]:bg-gray-100
                        [&::-webkit-scrollbar-thumb]:rounded-full
                        [&::-webkit-scrollbar-thumb]:bg-gray-300
                        dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                        dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
                      itemContent={renderContactRow}
                      components={{
                        EmptyPlaceholder: () => (
                          <div className="text-center p-4 text-sm text-muted-foreground">
                            No matching contacts found
                          </div>
                        ),
                      }}
                    />
                    {selectedContacts.length > 0 && (
                      <div className="flex justify-between items-center py-2 px-3 bg-muted/50 border-t">
                        <div className="text-sm font-medium">
                          {selectedContacts.length} selected
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => setSelectedContacts([])}
                        >
                          Clear selection
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/20 shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm leading-relaxed">
                <p className="font-medium text-green-700 dark:text-green-500 flex items-center gap-1.5 mb-2">
                  <PlusCircle className="w-4 h-4" /> Quick Tips
                </p>
                <ul className="space-y-2 text-slate-700 dark:text-slate-300 list-disc pl-5">
                  <li>
                    Use <strong>personalization fields</strong> to make your
                    messages more engaging
                  </li>
                  <li>
                    Add multiple recipients from your contact list or import via
                    CSV
                  </li>
                  <li>Schedule messages for later delivery</li>
                  <li>Attach images and documents (up to 5 files)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Schedule Bulk Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule Messages
            </DialogTitle>
            <DialogDescription>
              Provide a name for your scheduled campaign
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Campaign Name</Label>
            <Input
              placeholder="E.g., Holiday Greetings, Sales Announcement"
              value={scheduleName}
              onChange={(e) => setScheduleName(e.target.value)}
            />
            <div className="mt-3 flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-1">
                <CalendarIcon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Scheduled for:</p>
                <p className="text-muted-foreground">
                  {form.getValues("scheduledDate") &&
                  form.getValues("scheduledTime")
                    ? `${format(
                        form.getValues("scheduledDate"),
                        "MMMM d, yyyy"
                      )} at ${form.getValues("scheduledTime")}`
                    : "Date and time not selected"}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setScheduleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleScheduleBulk} className="gap-2">
              <Clock className="w-4 h-4" />
              Schedule {selectedContacts.length} message
              {selectedContacts.length !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Recipients Dialog */}
      <Dialog open={quickAddDialogOpen} onOpenChange={setQuickAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add Recipients
            </DialogTitle>
            <DialogDescription>
              Quickly add one or more recipients to your message
            </DialogDescription>
          </DialogHeader>
          <div
            className="space-y-4 max-h-[400px] p-2 overflow-y-auto [&::-webkit-scrollbar]:w-2
            [&::-webkit-scrollbar-track]:rounded-full
            [&::-webkit-scrollbar-track]:bg-gray-100
            [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-gray-300
            dark:[&::-webkit-scrollbar-track]:bg-neutral-700
            dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
          >
            {recipientRows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr,1.5fr,auto] gap-3 items-end"
              >
                <div className="space-y-1.5">
                  <Label htmlFor={`name-${index}`}>Name (Optional)</Label>
                  <Input
                    id={`name-${index}`}
                    value={row.name}
                    onChange={(e) =>
                      handleRecipientChange(index, "name", e.target.value)
                    }
                    placeholder="Contact name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`whatsapp-${index}`}>
                    WhatsApp Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id={`whatsapp-${index}`}
                    value={row.whatsapp_no}
                    onChange={(e) =>
                      handleRecipientChange(
                        index,
                        "whatsapp_no",
                        e.target.value
                      )
                    }
                    placeholder={`e.g. ${country_code || "91"}9905242174`}
                    required
                  />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRecipientRow(index)}
                        disabled={recipientRows.length <= 1}
                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Remove this recipient</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}

            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
              <p>New rows will be automatically added as you type.</p>
              <p className="mt-0.5">
                Include country code in the number (e.g., {country_code || "91"}
                9905242174)
              </p>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setQuickAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleImportRecipients} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Recipients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
