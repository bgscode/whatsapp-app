import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Group,
  Upload,
  User,
  X,
  UserPlus,
  UsersRound,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useGetGroups } from "@/lib/query/groups/queryMutaions";
import VirtualTable from "../table";
import { useGetContacts } from "@/lib/query/contacts/queryMutaion";
import { useGetContactGroups } from "@/lib/query/contact-groups/queryMutation";
import {
  Select,
  SelectItem,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectLabel,
  SelectGroup,
} from "../ui/select";
import readCSVAndExcel from "@/lib/readCsv&Excel";
import { MessageComposeDialog } from "./message-compose";
import { jP } from "@/lib/utils";

/**
 * Unified dialog component for selecting contacts, groups, or importing contacts
 *
 * @param {Object} props - Component props
 * @param {boolean} props.open - Whether the dialog is open
 * @param {Function} props.onOpenChange - Function to call when open state changes
 * @param {boolean} props.scheduledOn - Whether the message is scheduled
 */
export default function UnifiedSelectDialog({
  open,
  onOpenChange,
  scheduledOn,
}) {
  // Dialog state
  const [view, setView] = useState("main"); // "main", "contacts", "groups", "import"
  const [file, setFile] = useState(null);
  const [selectedConGroups, setSelectedConGroups] = useState("all");
  const [importing, setImporting] = useState(false);
  const [importsData, setImportsData] = useState(null);
  const [selectedImportsData, setSelectedImportsData] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);

  // compose message state
  const [composeMessageOpen, setComposeMessageOpen] = useState(false);
  const [messageRecipients, setMessageRecipients] = useState(null);

  // Fetch available whatsapp groups
  const { data: groupsData } = useGetGroups();
  const groups = groupsData?.groups || [];

  // Fetch contact groups data
  const { data: contactsGroupsData } = useGetContactGroups();
  const contactGroups = contactsGroupsData?.contact_groups || [];
  // console.log(contactGroups);

  // Helper to get a contact group name by its id
  const getContactGroupName = (id) => {
    const group = contactGroups.find((group) => group.id === id);
    return group ? group.name : "Unknown Group";
  };

  // Fetch contacts data and add a group_name field
  const { data: contactsData } = useGetContacts();
  const contacts =
    contactsData?.contacts?.map((c) => ({
      ...c,
      group_name: getContactGroupName(c.contact_group_id),
    })) || [];

  // Filter contacts based on selected contact group filter.
  const filteredContacts = contacts.filter((contact) => {
    if (!selectedConGroups || selectedConGroups === "all") return true;
    return contact.contact_group_id?.toString() === selectedConGroups;
  });

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setView("main");
      setFile(null);
      setSelectedConGroups("all");
      setSelectedContacts([]);
      setSelectedGroups([]);
      setSelectedImportsData([]);
      setImportsData(null);
      setMessageRecipients(null);
    }
  }, [open]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    setImporting(true);
    if (!file) {
      e.target.value = null;
      setImporting(false);
      return;
    }
    const data = await readCSVAndExcel(file, ["whatsapp_no"]);
    if (data) {
      setImportsData(data);
      setSelectedImportsData(data.data || []);
      setFile(file);
    }
    setImporting(false);
    // Additional file parsing can be implemented here if needed.
  };

  // Update handleConfirm to pass only the selected data based on the current view
  const handleConfirm = () => {
    let recipientData = { headers: [], data: [] };

    if (view === "contacts") {
      const selected = filteredContacts.filter((contact) =>
        selectedContacts.includes(contact.id)
      );

      if (selectedConGroups === "all") {
        recipientData = {
          headers: ["name", "whatsapp_no", "group_name"],
          data: selected.map((c) => ({
            name: c.name,
            whatsapp_no: c.whatsapp_no,
            group_name: c.group_name,
          })),
        };
      } else {
        const contactGroup = contactGroups.find(
          (group) => group.id === parseInt(selectedConGroups)
        );

        const groupFileds =
          jP(contactGroup.fields)
            ?.map((f) => f.id)
            .filter((f) => f !== "name" && f !== "whatsapp_no") || [];

        recipientData = {
          headers: [...["name", "whatsapp_no"], ...(groupFileds || [])],
          data: selected.map(
            (c) =>
              ({
                name: c.name,
                whatsapp_no: c.whatsapp_no,
                ...(jP(c.other_fields) || {}),
              } || {})
          ),
        };

        console.log(recipientData);
      }
    } else if (view === "groups") {
      console.log(selectedGroups);

      recipientData = {
        headers: ["name", "member_size"],
        data: selectedGroups.map((g) => ({
          name: g.name,
          member_size: g.member_size,
          whatsapp_no: g.group_id,
          contact_type: "group",
        })),
      };
    } else if (view === "import") {
      recipientData = {
        headers: importsData?.headers || [],
        data: selectedImportsData,
      };
    }

    setMessageRecipients(recipientData);
    setComposeMessageOpen(true);
  };

  const renderTitle = () => {
    switch (view) {
      case "main":
        return "Select Recipients";
      case "contacts":
        return "Select Contacts";
      case "groups":
        return "Select Groups";
      case "import":
        return "Import Contacts";
      default:
        return "Select Recipients";
    }
  };

  const renderDescription = () => {
    switch (view) {
      case "main":
        return "Choose how you want to add recipients to your message";
      case "contacts":
        return "Select one or more contacts to add to your message";
      case "groups":
        return "Select one or more groups to add to your message";
      case "import":
        return "Import contacts from a CSV or Excel file";
      default:
        return "";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[calc(100vh-4rem)] flex flex-col overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center mt-2">
              {view !== "main" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mr-2"
                  onClick={() => setView("main")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <DialogTitle>{renderTitle()}</DialogTitle>
                  <DialogDescription>{renderDescription()}</DialogDescription>
                </div>
                {view === "import" && (
                  <label
                    className="cursor-pointer border border-primary rounded-lg p-2 hover:bg-primary/10 transition-colors hover:text-primary"
                    disabled={importing}
                  >
                    <input
                      type="file"
                      className="hidden"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileChange}
                    />
                    <FileSpreadsheet className="mr-2 h-4 w-4 inline" />
                    {importing ? "Processing..." : "Choose File"}
                  </label>
                )}
              </div>
            </div>
          </DialogHeader>

          {view === "main" ? (
            <div className="grid gap-4 py-4 md:grid-cols-3">
              {/* Individual Contacts Option */}
              <Card
                className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => setView("contacts")}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">
                    Individual Contacts
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Select specific contacts from your contact list
                  </p>
                  {selectedContacts.length > 0 && (
                    <Badge variant="secondary">
                      {selectedContacts.length} selected
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="mt-auto gap-1">
                    Select <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Groups Option */}
              <Card
                className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => setView("groups")}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <UsersRound className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">WhatsApp Groups</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Send to existing WhatsApp groups
                  </p>
                  {selectedGroups.length > 0 && (
                    <Badge variant="secondary">
                      {selectedGroups.length} selected
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="mt-auto gap-1">
                    Select <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Import Option */}
              <Card
                className="cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                onClick={() => setView("import")}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <Upload className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-medium text-lg mb-1">Import Contacts</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Import contacts from CSV or Excel files
                  </p>
                  {selectedImportsData.length > 0 && (
                    <Badge variant="secondary">
                      {selectedImportsData.length} imported
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" className="mt-auto gap-1">
                    Import <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : view === "contacts" ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {contacts.length > 0 ? (
                <VirtualTable
                  leftJsx={
                    <Select
                      defaultValue={selectedConGroups}
                      value={selectedConGroups}
                      onValueChange={(value) => setSelectedConGroups(value)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Filter by Group</SelectLabel>
                          <SelectItem value="all" key="all">
                            All Contacts
                          </SelectItem>
                          {contactGroups.map((group) => (
                            <SelectItem
                              key={group.id}
                              value={group.id.toString()}
                            >
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  }
                  columns={[
                    { id: "name", header: "Name", name: "name" },
                    {
                      id: "whatsapp_no",
                      header: "WhatsApp Number",
                      name: "whatsapp_no",
                    },
                    {
                      id: "group_name",
                      header: "Contact Group",
                      name: "group_name",
                    },
                  ]}
                  data={filteredContacts}
                  config={{
                    searching: true,
                    selectable: true,
                    fixedHeight: "280px",
                    uniqueKey: "id",
                  }}
                  initialSelected={selectedContacts}
                  onSelectionChange={(selected) =>
                    setSelectedContacts(selected)
                  }
                />
              ) : (
                <div className="border rounded-lg flex-1 overflow-hidden">
                  <div className="p-8 text-center">
                    <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <h3 className="font-medium">No contacts found</h3>
                    <p className="text-sm text-muted-foreground">
                      Try a different search term
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : view === "groups" ? (
            <div className="flex-1 overflow-hidden flex flex-col">
              {groups.length > 0 ? (
                <VirtualTable
                  config={{
                    searching: true,
                    tableName: "Groups",
                    fixedHeight: "280px",
                    selectable: true,
                  }}
                  columns={[
                    { id: "name", header: "Name" },
                    { id: "member_size", header: "Members" },
                  ]}
                  data={groups}
                  initialSelected={selectedGroups}
                  onSelectionChange={(selected) => setSelectedGroups(selected)}
                />
              ) : (
                <div className="p-8 text-center">
                  <Group className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <h3 className="font-medium">No groups found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>
          ) : (
            // Import view
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="space-y-4 py-4">
                {importsData?.data?.length > 0 ? (
                  <VirtualTable
                    leftJsx={
                      <div className="w-64 flex items-center gap-2 p-1 border rounded-lg">
                        <FileSpreadsheet className="h-8 w-8 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-[12px] truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFile(null);
                            setImportsData(null);
                            setSelectedImportsData([]);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                    columns={(importsData?.headers || []).map((header) => ({
                      id: header,
                      header: header.toUpperCase(),
                      name: header,
                    }))}
                    data={importsData?.data || []}
                    config={{
                      searching: true,
                      selectable: true,
                      fixedHeight: "280px",
                    }}
                    initialSelected={selectedImportsData}
                    onSelectionChange={(sl) => setSelectedImportsData(sl)}
                  />
                ) : (
                  <div className="p-8 flex items-center justify-center border rounded-lg h-[350px]">
                    <div className="text-center">
                      <div className="bg-primary/10 w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                        <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                      </div>
                      <h3 className="font-medium">No file imports</h3>
                      <p className="text-sm text-muted-foreground">
                        Upload a CSV or Excel file to import contacts
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {view !== "main" && (
              <Button
                onClick={handleConfirm}
                disabled={
                  importing ||
                  (selectedContacts.length === 0 &&
                    selectedGroups.length === 0 &&
                    selectedImportsData.length === 0)
                }
              >
                Compose Message
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MessageComposeDialog
        open={composeMessageOpen}
        onOpenChange={setComposeMessageOpen}
        isSchedule={scheduledOn}
        recipientData={messageRecipients || { headers: [], data: [] }}
      />
    </>
  );
}
