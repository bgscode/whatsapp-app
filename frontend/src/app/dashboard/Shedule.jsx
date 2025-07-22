import * as React from "react";
import { useState, useEffect } from "react";
import {
  CalendarIcon,
  Clock,
  Edit,
  MoreVertical,
  Plus,
  Trash,
  Calendar as CalendarLucide,
  CheckCircle,
  XCircle,
  Clock3,
  Filter,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Virtuoso } from "react-virtuoso";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import UnifiedSelectDialog from "@/components/compose/select-recipients";
import {
  useDeleteScheduledMessage,
  useGetShecduledMessages,
  useUpdateScheduledMessage,
} from "@/lib/query/scheduled/queryMutaion";

// Helper: Transform raw scheduled messages into groups based on name, date, time and status.
function transformScheduledMessages(scheduled = []) {
  if (!Array.isArray(scheduled) || scheduled.length === 0) return [];

  const groupsMap = new Map();

  for (const msg of scheduled) {
    const {
      name,
      schedule_date,
      schedule_time,
      status,
      id,
      whatsapp_no,
      contact_type,
      message,
      attachment_document,
      attachment_thumbnail,
      error_message,
      created_at,
      updated_at,
    } = msg;

    const groupKey = `${name}||${schedule_date}||${schedule_time}||${status}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, {
        id, // use the first message id as group id
        name,
        schedule_date,
        schedule_time,
        status,
        recipients: [],
      });
    }
    groupsMap.get(groupKey).recipients.push({
      id,
      whatsapp_no,
      contact_type,
      message,
      attachment_document,
      attachment_thumbnail,
      error_message,
      created_at,
      updated_at,
    });
  }

  return Array.from(groupsMap.values());
}

export default function SchedulePage() {
  const [filter, setFilter] = useState("all");
  const [openNewDialog, setOpenNewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editData, setEditData] = useState(null);

  const { data: scheduleData } = useGetShecduledMessages({ status: filter });
  const schedules =
    transformScheduledMessages(scheduleData?.scheduled_messages) || [];

  const { mutate: updateSchedule } = useUpdateScheduledMessage();
  const { mutate: deleteSchedule } = useDeleteScheduledMessage();

  // Local state for the edit form
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState(""); // date string in yyyy-MM-dd
  const [editTime, setEditTime] = useState(""); // time string

  // When editData changes, update local edit form states.
  useEffect(() => {
    if (editData) {
      setEditName(editData.name || "");
      setEditDate(editData.schedule_date || "");
      setEditTime(editData.schedule_time || "00:00");
    }
  }, [editData]);

  // Toggle new schedule dialog
  function toggleNewDialog() {
    setOpenNewDialog((prev) => !prev);
  }

  // Open edit dialog and set the data for the selected schedule
  function handleEdit(schedule) {
    setEditData(schedule);
    setOpenEditDialog(true);
  }

  // Remove recipient from the editData recipients list
  function handleRemoveRecipient(recipientId) {
    if (
      editData &&
      confirm("Are you sure you want to remove this recipient?")
    ) {
      const newRecipients = editData.recipients.filter(
        (r) => r.id !== recipientId
      );
      setEditData({ ...editData, recipients: newRecipients });
    }
  }

  // Handle save changes in the edit dialog and print updated data to console.
  function handleSaveEdit() {
    if (!editData) return;
    // Prevent update if status is "sent"
    if (editData.status === "sent") return;

    // convert data of orignal form
    const schedules = [];
    for (const element of editData.recipients) {
      schedules.push({
        ...element,
        status: editData.status,
        shedule_name: editName,
        schedule_date: editDate,
        schedule_time: editTime,
      });
    }
    updateSchedule(
      { schedules },
      {
        onSuccess: () => {
          setOpenEditDialog(false);
          setEditData(null);
        },
      }
    );
  }

  // Delete schedule handler
  function handleDelete(schedule) {
    if (confirm("Are you sure you want to delete this schedule?")) {
      if (schedule.recipients.length === 0) {
        deleteSchedule(schedule.id);
      } else {
        deleteSchedule(schedule.recipients.map((r) => r.id));
      }
    }
  }

  // Helper function to get status badge styling
  function getStatusBadge(status) {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Sent
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 flex items-center gap-1">
            <Clock3 className="w-3 h-3" />
            Scheduled
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 hover:bg-red-600 flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-4">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Scheduled Messages</h2>
            <p className="text-muted-foreground">
              Plan and manage your WhatsApp messages
            </p>
          </div>
          <Button onClick={toggleNewDialog} size="lg" className="gap-2">
            <Plus className="w-4 h-4" />
            New Schedule
          </Button>
        </div>

        {/* Main Card */}
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="mb-2 bg-muted/20">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarLucide className="w-5 h-5 text-primary" />
                  Upcoming Schedules
                </CardTitle>
                <CardDescription>
                  View and manage your scheduled WhatsApp messages
                </CardDescription>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 bg-muted p-1 px-3 rounded-md">
                      <Filter className="w-4 h-4 text-muted-foreground" />
                      <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-[140px] border-0 bg-transparent p-0 h-8 focus:ring-0">
                          <SelectValue placeholder="Filter" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Schedules</SelectItem>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Filter schedules by status</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent>
            {schedules.length === 0 && (
              <div className="text-center py-8">
                <CalendarIcon className="mx-auto h-12 w-12 text-muted-foreground/60" />
                <h3 className="mt-2 text-lg font-medium">No schedules found</h3>
                <p className="text-sm text-muted-foreground">
                  Create your first scheduled message by clicking "New Schedule"
                </p>
                <Button onClick={toggleNewDialog} className="mt-4">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </div>
            )}
            {schedules.length > 0 && (
              <div className="space-y-4">
                <Virtuoso
                  data={schedules}
                  totalCount={schedules.length}
                  className="overflow-y-auto
                      [&::-webkit-scrollbar]:w-2
                      [&::-webkit-scrollbar-track]:rounded-full
                      [&::-webkit-scrollbar-track]:bg-gray-100
                      [&::-webkit-scrollbar-thumb]:rounded-full
                      [&::-webkit-scrollbar-thumb]:bg-gray-300
                      dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                      dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
                  style={{ height: "400px" }}
                  itemContent={(index, sched) => (
                    <Card
                      key={sched.id}
                      className="mb-3 overflow-hidden border-l-4 hover:shadow-md transition-all"
                      style={{
                        borderLeftColor:
                          sched.status === "sent"
                            ? "#10b981"
                            : sched.status === "scheduled"
                            ? "#3b82f6"
                            : sched.status === "failed"
                            ? "#ef4444"
                            : "#d1d5db",
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <h3 className="font-medium text-lg tracking-tight">
                              {sched.name || `Schedule #${sched.id}`}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                                <CalendarIcon className="w-3 h-3 text-muted-foreground" />
                                <span>{sched.schedule_date}</span>
                              </div>
                              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>{sched.schedule_time}</span>
                              </div>
                              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-sm">
                                <Users className="w-3 h-3 text-muted-foreground" />
                                <span>{sched.recipients.length}</span>
                              </div>
                              {getStatusBadge(sched.status)}
                            </div>
                          </div>

                          {/* Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(sched)}
                                disabled={sched.status === "sent"}
                                className={
                                  sched.status === "sent"
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDelete(sched)}
                              >
                                <Trash className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Schedule Dialog */}
      <UnifiedSelectDialog
        open={openNewDialog}
        scheduledOn={true}
        onOpenChange={toggleNewDialog}
      />

      {/* Edit Schedule Dialog */}
      <Dialog
        open={openEditDialog}
        onOpenChange={() => setOpenEditDialog(false)}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Schedule
            </DialogTitle>
            <DialogDescription>
              Update schedule details and manage recipients
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Schedule Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter a name for this schedule"
                disabled={editData?.status === "sent"}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full flex justify-start text-left"
                      disabled={editData?.status === "sent"}
                    >
                      <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                      {editDate
                        ? format(parseISO(editDate), "MMM dd, yyyy")
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="p-0">
                    <Calendar
                      mode="single"
                      selected={editDate ? parseISO(editDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEditDate(format(date, "yyyy-MM-dd"));
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  disabled={editData?.status === "sent"}
                  className="w-full"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Recipients</label>
                <Badge variant="outline">
                  {editData?.recipients?.length || 0} total
                </Badge>
              </div>

              {editData && editData.recipients.length > 0 ? (
                <div
                  className="max-h-[200px] overflow-y-auto rounded-md border p-1
                  [&::-webkit-scrollbar]:w-2
                  [&::-webkit-scrollbar-track]:rounded-full
                  [&::-webkit-scrollbar-track]:bg-gray-100
                  [&::-webkit-scrollbar-thumb]:rounded-full
                  [&::-webkit-scrollbar-thumb]:bg-gray-300
                  dark:[&::-webkit-scrollbar-track]:bg-neutral-700
                  dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500"
                >
                  <Virtuoso
                    data={editData.recipients}
                    totalCount={editData.recipients.length}
                    style={{ height: "200px" }}
                    itemContent={(index, recipient) => (
                      <div
                        key={recipient.id}
                        className="flex items-center justify-between my-1 gap-2 py-2 px-3 hover:bg-muted rounded-md transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-background">
                            {recipient.whatsapp_no}
                          </Badge>
                          <div className="flex-1 max-w-[200px]">
                            <span className="text-xs text-muted-foreground truncate block">
                              {recipient.message?.length > 30
                                ? recipient.message.substring(0, 30) + "..."
                                : recipient.message || "No message"}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRemoveRecipient(recipient.id)}
                          disabled={editData?.status === "sent"}
                        >
                          <Trash className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground bg-muted/40 p-4 rounded-md text-center">
                  No recipients. Add recipients to send this message.
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editData?.status === "sent"}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
