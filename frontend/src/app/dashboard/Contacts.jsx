import { useState, useMemo, useCallback } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import {
  Download,
  FileSpreadsheet,
  MoreVertical,
  Pencil,
  Plus,
  Send,
  Trash,
  Upload,
  UserPlus,
  Users,
  User,
  X,
  Filter,
  Tag,
  FileText,
  Check,
  Info,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  useAddContactGroup,
  useAllContactsExport,
  useDeleteContactGroup,
  useExportContactInGroups,
  useGetContactGroups,
  useImportContactsInGroup,
  useSelectedContactsExport,
  useUpdateContactGroup,
} from "@/lib/query/contact-groups/queryMutation";
import {
  useAddContact,
  useDeleteContact,
  useGetContacts,
  useUpdateContact,
} from "@/lib/query/contacts/queryMutaion";
import toast from "react-hot-toast";
import { jP } from "@/lib/utils";
import fileDownload from "js-file-download";
import VirtualTable from "@/components/table";
import readCSVAndExcel from "@/lib/readCsv&Excel";
import { MessageComposeDialog } from "@/components/compose/message-compose";

// Default values for forms
const DEFAULT_GROUP_FIELDS = [
  { id: "name", name: "Name", required: true },
  { id: "whatsapp_no", name: "WhatsApp No", required: true },
];
const DEFAULT_GROUP_VALUES = {
  name: "",
  fields: DEFAULT_GROUP_FIELDS,
};
const DEFAULT_CONTACT_VALUES = {
  name: "",
  whatsapp_no: "",
  group_id: "",
  dynamicFields: {},
};

// Zod schema for Group form
const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  fields: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Field name is required"),
      required: z.boolean(),
    })
  ),
});

// Zod schema for Contact form
const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  whatsapp_no: z.string().min(1, "WhatsApp number is required"),
  group_id: z.string().min(1, "Group is required"),
  dynamicFields: z.record(z.string().optional()).optional(),
});

// Configuration for VirtualTable
const config = {
  selectable: true,
  fixedHeight: "300px",
  searching: true,
  searchKey: "name,whatsapp_no",
  sortable: true,
  leftJsx: null,
  defaultSort: [{ key: "name", direction: "asc" }],
  uniqueKey: "id",
};

export default function ContactsPage() {
  // UI state
  const [recipientData, setRecipientData] = useState({ headers: [], data: [] });
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [isAddContactOpen, setIsAddContactOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isImportContactsOpen, setIsImportContactsOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editingContactId, setEditingContactId] = useState(null);
  const [selectTemp, setSelectTemp] = useState("");
  const [importsData, setImportsData] = useState({ headers: [], data: [] });
  const [selectedImportsData, setSelectedImportsData] = useState([]);
  const [importing, setImporting] = useState(false);

  // Fetching backend data for groups and contacts
  const { data: contactGroupsData } = useGetContactGroups();
  const groups = contactGroupsData?.contact_groups || [];
  const { mutate: addContactGroup } = useAddContactGroup();
  const { mutate: updateContactGroup } = useUpdateContactGroup();
  const { mutate: deleteContactGroup } = useDeleteContactGroup();

  const { data: contactsData } = useGetContacts();
  const contacts = contactsData?.contacts || [];
  const { mutate: addContact } = useAddContact();
  const { mutate: updateContact } = useUpdateContact();
  const { mutate: deleteContact } = useDeleteContact();

  // Exports
  const { mutate: allContactsExports } = useAllContactsExport();
  const { mutate: selectedContactExports } = useSelectedContactsExport();
  const { mutate: selectedAndAllGroupsMemberExp } = useExportContactInGroups();
  const { mutate: importContactsInGroup } = useImportContactsInGroup();

  // Group Form
  const groupForm = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: DEFAULT_GROUP_VALUES,
  });
  const {
    fields: groupFields,
    append: appendField,
    remove: removeField,
  } = useFieldArray({
    control: groupForm.control,
    name: "fields",
  });

  // Contact Form
  const contactForm = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: DEFAULT_CONTACT_VALUES,
  });

  // Helper: Get additional fields for a group
  const getGroupFields = (groupId) => {
    const group = groups.find((g) => g.id.toString() === groupId);
    if (!group) return [];
    return typeof group.fields === "string"
      ? JSON.parse(group.fields)
      : group.fields;
  };

  // Helper: Download CSV template for group
  const getGroupTemplate = (groupId) => {
    const group = groups.find((g) => g.id.toString() === groupId);
    if (!group) {
      toast.error("Group not found");
      return;
    }
    const fields = jP(group.fields);
    const header = fields?.map((field) => field.id);
    const data = Array.from({ length: 5 }, (_, i) =>
      fields.map((field) => `${field.name} ${i + 1}`)
    );
    const csv = [header, ...data].map((row) => row.join(",")).join("\n");
    fileDownload(csv, `${group.name}-sample.csv`);
  };

  // Form submission handlers
  const onSubmitGroup = (data) => {
    const payload = { name: data.name, fields: JSON.stringify(data.fields) };
    if (isEditingGroup && editingGroupId) {
      updateContactGroup(
        { ...payload, id: editingGroupId },
        {
          onSuccess: () => {
            toast.success("Group updated successfully");
            groupForm.reset(DEFAULT_GROUP_VALUES);
            setIsAddGroupOpen(false);
            setIsEditingGroup(false);
            setEditingGroupId(null);
          },
        }
      );
    } else {
      addContactGroup(payload, {
        onSuccess: () => {
          toast.success("Group added successfully");
          groupForm.reset(DEFAULT_GROUP_VALUES);
          setIsAddGroupOpen(false);
        },
      });
    }
  };

  const onSubmitContact = (data) => {
    const payload = {
      name: data.name,
      whatsapp_no: data.whatsapp_no,
      contact_group_id: data.group_id,
      other_fields: JSON.stringify(data.dynamicFields || {}),
    };
    if (isEditingContact && editingContactId) {
      updateContact(
        { ...payload, id: editingContactId },
        {
          onSuccess: () => {
            toast.success("Contact updated successfully");
            contactForm.reset(DEFAULT_CONTACT_VALUES);
            setIsAddContactOpen(false);
            setIsEditingContact(false);
            setEditingContactId(null);
          },
        }
      );
    } else {
      addContact(payload, {
        onSuccess: () => {
          toast.success("Contact added successfully");
          contactForm.reset(DEFAULT_CONTACT_VALUES);
          setIsAddContactOpen(false);
        },
      });
    }
  };

  // Edit handlers
  const handleEditGroup = useCallback(
    (group) => {
      const parsedFields =
        typeof group.fields === "string"
          ? JSON.parse(group.fields)
          : group.fields;
      groupForm.reset({ name: group.name, fields: parsedFields });
      setEditingGroupId(group.id);
      setIsEditingGroup(true);
      setIsAddGroupOpen(true);
    },
    [groupForm]
  );

  const handleEditContact = useCallback(
    (contact) => {
      const otherFields =
        typeof contact.other_fields === "string"
          ? JSON.parse(contact.other_fields || "{}")
          : contact.other_fields || {};
      contactForm.reset({
        name: contact.name,
        whatsapp_no: contact.whatsapp_no,
        group_id: contact.contact_group_id.toString(),
        dynamicFields: otherFields,
      });
      setEditingContactId(contact.id);
      setIsEditingContact(true);
      setIsAddContactOpen(true);
    },
    [contactForm]
  );

  const handleDeleteContact = (contactId) => {
    if (confirm("Are you sure you want to delete this contact?")) {
      deleteContact(contactId, {
        onSuccess: () => {
          toast.success("Contact deleted successfully");
        }
      });
    }
  };

  const handleDeleteGroup = (groupId) => {
    if (confirm("Are you sure you want to delete this group? All contacts in this group will be lost.")) {
      deleteContactGroup(groupId, {
        onSuccess: () => {
          toast.success("Group deleted successfully");
        }
      });
    }
  };

  const getGroupName = (groupId) => {
    const group = groups.find((g) => g.id.toString() === groupId?.toString());
    return group ? group.name : "Unknown";
  };

  // Handle group change: update group and reset selected contacts
  const handleGroupChange = (groupId) => {
    setSelectedGroup(groupId);
    setSelectedContacts([]);
  };

  // Handle importing contacts from file
  const handleImportContacts = async (e) => {
    const file = e.target.files[0];
    setImporting(true);
    if (!file) {
      e.target.value = null;
      setImporting(false);
      return;
    }
    
    if (!selectTemp || selectTemp === "all") {
      toast.error("Please select a group to import contacts");
      setImporting(false);
      return;
    } 
    
    toast.loading("Importing contacts...", { id: "import" });
    
    try {
      const requiredColumns = getGroupFields(selectTemp)
        .filter((v) => v?.required)
        .map((f) => f.id);
        
      const data = await readCSVAndExcel(file, requiredColumns);
      if (data) {
        setImportsData(data);
        setSelectedImportsData(data.data || []);
        toast.success(`${data.data.length} contacts found in file`, { id: "import" });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Error importing contacts. Please check file format.", { id: "import" });
    } finally {
      setImporting(false);
    }
  };

  const handleImportContactsSubmit = () => {
    if (selectTemp === "all" || importsData.data.length === 0) {
      toast.error(
        "Please select a group and ensure there are contacts to import"
      );
      return;
    }
    
    const groupsFields = getGroupFields(selectTemp).map((f) => f.id);
    
    toast.loading(`Importing ${selectedImportsData.length} contacts...`, { id: "importing-contacts" });
    
    importContactsInGroup(
      {
        headers: groupsFields,
        data: selectedImportsData,
        groupId: selectTemp,
      },
      {
        onSuccess: () => {
          toast.success(`${selectedImportsData.length} contacts imported successfully`, { id: "importing-contacts" });
          setIsImportContactsOpen(false);
          setImportsData({ headers: [], data: [] });
        },
        onError: (error) => {
          console.error("Import error:", error);
          toast.error("Error importing contacts", { id: "importing-contacts" });
        }
      }
    );
  };

  const scrollClass = `[&::-webkit-scrollbar]:w-2
    [&::-webkit-scrollbar-track]:rounded-full
    [&::-webkit-scrollbar-track]:bg-gray-100
    [&::-webkit-scrollbar-thumb]:rounded-full
    [&::-webkit-scrollbar-thumb]:bg-gray-300
    dark:[&::-webkit-scrollbar-track]:bg-neutral-700
    dark:[&::-webkit-scrollbar-thumb]:bg-neutral-500`;

  // Memoize table columns so dynamic columns update when group changes.
  const tableColumns = useMemo(() => {
    const dynamicFields = getGroupFields(selectedGroup).filter(
      (field) => !["name", "whatsapp_no"].includes(field?.id)
    );
    return [
      { id: "name", name: "Name", header: "Name" },
      { id: "whatsapp_no", name: "WhatsApp No", header: "WhatsApp No" },
      {
        id: "groupName",
        name: "Group",
        header: "Group",
        render: (_, contact) => (
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10">
            {getGroupName(contact.contact_group_id)}
          </Badge>
        ),
      },
      ...dynamicFields.map((field) => ({
        id: field.id,
        name: field.name,
        header: field.name,
        render: (_, contact) => contact[field.id] || "-",
      })),
      {
        id: "actions",
        name: "Actions",
        header: "Actions",
        render: (_, contact) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => handleDeleteContact(contact.id)}
              >
                <Trash className="w-4 h-4 mr-2" /> Delete Contact
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ];
  }, [selectedGroup, groups, getGroupName, handleEditContact]);

  // Memoize filtered contacts with dynamic data included
  const filteredContacts = useMemo(() => {
    const dynamicKeys = getGroupFields(selectedGroup)
      .map((v) => v.id)
      .filter((field) => !["name", "whatsapp_no"].includes(field));
    return contacts
      .filter(
        (contact) =>
          selectedGroup === "all" ||
          contact.contact_group_id?.toString() === selectedGroup
      )
      .map((contact) => {
        let data = { ...contact };
        if (selectedGroup === "all") {
          data.groupName = getGroupName(contact.contact_group_id);
        } else {
          const otherFields =
            typeof contact.other_fields === "string"
              ? JSON.parse(contact.other_fields || "{}")
              : contact.other_fields || {};
          data = {
            ...data,
            ...dynamicKeys.reduce((acc, key) => {
              acc[key] = otherFields[key] || "-";
              return acc;
            }, {}),
          };
        }
        return data;
      });
  }, [selectedGroup, contacts, groups]);

  const handleSendMessage = () => {
    const selectedContactsData = filteredContacts.filter((contact) =>
      selectedContacts.includes(contact.id)
    );
    const headers =
      selectedGroup === "all"
        ? ["name", "whatsapp_no"]
        : getGroupFields(selectedGroup)?.map((f) => f.id) || [];
    setRecipientData({ headers, data: selectedContactsData });
    setIsScheduleOpen(true);
  };

  // Get group statistics
  const groupStats = useMemo(() => {
    const stats = groups.map(group => {
      const contactCount = contacts.filter(
        c => c.contact_group_id?.toString() === group.id.toString()
      ).length;
      
      return {
        id: group.id,
        name: group.name,
        count: contactCount
      };
    });
    
    return stats;
  }, [groups, contacts]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">Contact Management</h2>
          <p className="text-muted-foreground">Organize and manage your WhatsApp contacts</p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (selectedGroup === "all") {
                      allContactsExports();
                    } else {
                      selectedAndAllGroupsMemberExp({
                        groupId: selectedGroup,
                        name: getGroupName(selectedGroup),
                      });
                    }
                  }}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" /> Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export contacts as CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Dialog
            open={isAddGroupOpen}
            onOpenChange={(open) => {
              if (!open) {
                groupForm.reset(DEFAULT_GROUP_VALUES);
                setIsEditingGroup(false);
                setEditingGroupId(null);
              }
              setIsAddGroupOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => {
                  if (!isEditingGroup) {
                    groupForm.reset(DEFAULT_GROUP_VALUES);
                  }
                }}
              >
                <Users className="w-4 h-4" />{" "}
                {isEditingGroup ? "Edit Group" : "Add Group"}
              </Button>
            </DialogTrigger>
            <DialogContent
              className={`max-w-2xl max-h-[calc(100vh-100px)] overflow-y-auto ${scrollClass}`}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  {isEditingGroup ? "Edit Group" : "Add New Group"}
                </DialogTitle>
                <DialogDescription>
                  {isEditingGroup
                    ? "Update group details and customize fields"
                    : "Create a new contact group with custom fields"}
                </DialogDescription>
              </DialogHeader>
              <Form {...groupForm}>
                <form
                  onSubmit={groupForm.handleSubmit(onSubmitGroup)}
                  className="space-y-4"
                >
                  <FormField
                    control={groupForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Group Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter group name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Group Fields</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => {
                          appendField({
                            id: `field_${Date.now()}`,
                            name: "",
                            required: false,
                          });
                        }}
                      >
                        <Plus className="w-3 h-3" /> Add Field
                      </Button>
                    </div>
                    <Alert variant="info" className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-900 mb-4">
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        Fields will be available when adding contacts to this group. Name and WhatsApp Number are always included.
                      </AlertDescription>
                    </Alert>
                    <div className="border rounded-md">
                      {groupFields.map((field, index) => (
                        <FormField
                          key={field.id}
                          control={groupForm.control}
                          name={`fields.${index}.name`}
                          render={({ field: formField }) => (
                            <div className="flex items-center justify-between p-3 border-b last:border-b-0">
                              <FormItem className="flex-1 mr-4">
                                <FormControl>
                                  <Input
                                    placeholder="Field name"
                                    className="w-full"
                                    {...formField}
                                    onChange={(e) => {
                                      const value = e.target.value;
                                      groupForm.setValue(
                                        `fields.${index}.id`,
                                        value.toLowerCase().replace(/\s+/g, "_")
                                      );
                                      groupForm.setValue(
                                        `fields.${index}.name`,
                                        value
                                      );
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Switch
                                  checked={field.required}
                                  onCheckedChange={(checked) => {
                                    const fields = [
                                      ...groupForm.getValues("fields"),
                                    ];
                                    fields[index] = {
                                      ...fields[index],
                                      required: checked,
                                    };
                                    groupForm.setValue("fields", fields, {
                                      shouldDirty: true,
                                    });
                                  }}
                                  disabled={["name", "whatsapp_no"].includes(
                                    field.id
                                  )}
                                />
                                <span className="text-sm">
                                  {field.required ? "Required" : "Optional"}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeField(index)}
                                disabled={["name", "whatsapp_no"].includes(
                                  field.id
                                )}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <DialogFooter className="pt-4 border-t">
                    <Button type="submit" className="gap-2">
                      {isEditingGroup ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {isEditingGroup ? "Update Group" : "Create Group"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Dialog
            open={isAddContactOpen}
            onOpenChange={(open) => {
              if (!open) {
                contactForm.reset(DEFAULT_CONTACT_VALUES);
                setIsEditingContact(false);
                setEditingContactId(null);
              }
              setIsAddContactOpen(open);
            }}
          >
            <DialogTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  if (!isEditingContact) {
                    contactForm.reset(DEFAULT_CONTACT_VALUES);
                  }
                }}
              >
                <UserPlus className="w-4 h-4" />{" "}
                {isEditingContact ? "Edit Contact" : "Add Contact"}
              </Button>
            </DialogTrigger>
            <DialogContent
              className={`max-w-2xl max-h-[calc(100vh-100px)] overflow-y-auto ${scrollClass}`}
            >
              <DialogHeader className="flex flex-row items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    {isEditingContact ? <Pencil className="w-5 h-5 text-primary" /> : <UserPlus className="w-5 h-5 text-primary" />}
                    {isEditingContact ? "Edit Contact" : "Add New Contact"}
                  </DialogTitle>

                  <DialogDescription>
                    {isEditingContact
                      ? "Update contact details"
                      : "Add a new contact to your selected group"}
                  </DialogDescription>
                </div>
                <Button
                  variant="outline"
                  type="button"
                  className="float-end gap-2"
                  onClick={() => {
                    groupForm.reset(DEFAULT_GROUP_VALUES);
                    setIsAddGroupOpen(true);
                  }}
                >
                  <Users className="w-4 h-4" /> Add Group
                </Button>
              </DialogHeader>
              <Form {...contactForm}>
                <form
                  onSubmit={contactForm.handleSubmit(onSubmitContact)}
                  className="space-y-4"
                >
                  <FormField
                    control={contactForm.control}
                    name="group_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Group</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="h-10">
                              <SelectValue placeholder="Select a group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {groups.map((group) => (
                              <SelectItem
                                key={group.id}
                                value={group.id.toString()}
                              >
                                {group.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={contactForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter contact name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contactForm.control}
                      name="whatsapp_no"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>WhatsApp No</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter WhatsApp number"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {contactForm.watch("group_id") && (
                    <div className="space-y-4 border rounded-lg p-4 pt-2 bg-muted/10">
                      <h3 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <Tag className="h-4 w-4 text-primary" />
                        Additional Fields
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {getGroupFields(contactForm.watch("group_id"))
                          .filter(
                            (field) => !["name", "whatsapp_no"].includes(field.id)
                          )
                          .map((field) => (
                            <FormField
                              key={field.id}
                              control={contactForm.control}
                              name={`dynamicFields.${field.id}`}
                              render={({ field: formField }) => (
                                <FormItem>
                                  <FormLabel>
                                    {field.name}
                                    {field.required && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder={`Enter ${field.name.toLowerCase()}`}
                                      {...formField}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ))}
                      </div>
                    </div>
                  )}
                  <DialogFooter className="pt-4 border-t">
                    <Button type="submit" className="gap-2">
                      {isEditingContact ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                      {isEditingContact ? "Update Contact" : "Add Contact"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsImportContactsOpen(true)}
          >
            <Upload className="w-4 h-4" /> Import
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Contacts Section */}
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="pb-2 bg-muted/20">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> 
                  Contacts
                </CardTitle>
                <CardDescription>View and manage your WhatsApp contacts</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {selectedContacts.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-lg mb-4">
                <div className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <Check className="w-4 h-4" />
                  {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleSendMessage}
                  >
                    <Send className="w-4 h-4" /> Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (selectedGroup === "all") {
                        selectedContactExports(selectedContacts);
                      } else {
                        selectedAndAllGroupsMemberExp({
                          groupId: selectedGroup,
                          ids: selectedContacts,
                          name: getGroupName(selectedGroup),
                        });
                      }
                    }}
                  >
                    <Download className="w-4 h-4" /> Export
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedContacts([])}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="bg-muted/10 p-2 mb-4 rounded-md flex items-center">
              <Filter className="w-4 h-4 text-muted-foreground ml-2 mr-1" />
              <Select value={selectedGroup} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-[200px] border-0 bg-transparent h-8 focus:ring-0">
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="ml-auto flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground mr-2">Search by name or WhatsApp number</span>
              </div>
            </div>
            
            <VirtualTable
              columns={tableColumns}
              config={config}
              data={filteredContacts}
              onSelectionChange={(selectedIds) =>
                setSelectedContacts(selectedIds)
              }
              initialSelected={selectedContacts}
            />
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-8 mt-2">
                <User className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
                <p className="text-muted-foreground">
                  No contacts found. {selectedGroup !== "all" && "Try selecting a different group or "} 
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-primary" 
                    onClick={() => setIsAddContactOpen(true)}
                  >
                    add a new contact
                  </Button>
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between py-3 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Total: {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setIsImportContactsOpen(true)}
              >
                <Upload className="w-3 h-3" /> Import
              </Button>
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  contactForm.reset(DEFAULT_CONTACT_VALUES);
                  setIsAddContactOpen(true);
                }}
              >
                <UserPlus className="w-3 h-3" /> Add Contact
              </Button>
            </div>
          </CardFooter>
        </Card>

        {/* Groups Section */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card className="shadow-sm border-t-4 border-t-green-500">
            <CardHeader className="bg-muted/20 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" /> 
                Groups
              </CardTitle>
              <CardDescription>
                Manage your contact groups
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2" />
                    <p className="text-muted-foreground mb-3">No groups created yet</p>
                    <Button 
                      onClick={() => {
                        groupForm.reset(DEFAULT_GROUP_VALUES);
                        setIsAddGroupOpen(true);
                      }}
                      size="sm"
                      className="gap-1"
                    >
                      <Plus className="w-3 h-3" /> Create Group
                    </Button>
                  </div>
                ) : (
                  <ScrollArea className="h-[360px] pr-4 -mr-4">
                    <div className="grid gap-3">
                      {groups.map((group) => {
                        const contactCount = contacts.filter(
                          (c) => c.contact_group_id?.toString() === group.id.toString()
                        ).length;
                        const parsedFields =
                          typeof group.fields === "string"
                            ? JSON.parse(group.fields)
                            : group.fields;
                        return (
                          <Card
                            key={group.id}
                            className={`overflow-hidden border hover:border-primary/30 transition-all ${
                              selectedGroup === group.id.toString() ? "bg-primary/5 border-primary/30" : ""
                            }`}
                          >
                            <CardContent className="p-0">
                              <div className="p-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex gap-2 items-center">
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 hover:bg-green-200 dark:hover:bg-green-800">
                                      {group.name}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {contactCount} contact{contactCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                  
                                  <div className="flex gap-1">
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                                            onClick={() => handleGroupChange(group.id.toString())}
                                          >
                                            <Filter className="w-3 h-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Filter contacts by this group
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                        >
                                          <MoreVertical className="w-3 h-3" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={() => handleEditGroup(group)}
                                        >
                                          <Pencil className="w-4 h-4 mr-2" /> Edit Group
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => getGroupTemplate(group.id.toString())}
                                        >
                                          <Download className="w-4 h-4 mr-2" /> Download Template
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          className="text-destructive"
                                          onClick={() => handleDeleteGroup(group.id)}
                                        >
                                          <Trash className="w-4 h-4 mr-2" /> Delete Group
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                
                                {parsedFields.filter(f => !["name", "whatsapp_no"].includes(f.id)).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {parsedFields
                                      .filter(f => !["name", "whatsapp_no"].includes(f.id))
                                      .map(field => (
                                        <Badge 
                                          key={field.id}
                                          variant="outline" 
                                          className="text-xs font-normal bg-muted/30"
                                        >
                                          {field.name}{field.required && "*"}
                                        </Badge>
                                      ))
                                    }
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
            <CardFooter className="py-3 border-t bg-muted/10">
              <Button
                className="gap-2 w-full"
                variant="outline"
                onClick={() => {
                  groupForm.reset(DEFAULT_GROUP_VALUES);
                  setIsAddGroupOpen(true);
                }}
              >
                <Plus className="w-4 h-4" /> Add New Group
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Import Contacts Dialog */}
      <Dialog
        open={isImportContactsOpen}
        onOpenChange={setIsImportContactsOpen}
      >
        <DialogContent
          className={`max-w-2xl max-h-[calc(100vh-100px)] overflow-y-auto ${scrollClass}`}
        >
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary" />
                Import Contacts
              </DialogTitle>
              <DialogDescription>
                Import contacts from a CSV or Excel file
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              type="button"
              className="float-end"
              onClick={() => {
                groupForm.reset(DEFAULT_GROUP_VALUES);
                setIsAddGroupOpen(true);
              }}
            >
              <Users className="w-4 h-4 mr-2" /> Add Group
            </Button>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-base">Select Group</Label>
              <Select defaultValue={selectTemp} onValueChange={setSelectTemp}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Choose the group where you want to import contacts
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-base">Download Template</Label>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!selectTemp) {
                      toast.error(
                        "Please select a group to download the template"
                      );
                    } else {
                      getGroupTemplate(selectTemp);
                    }
                  }}
                  size="sm"
                  className="gap-1"
                  title={
                    selectTemp
                      ? "Download a template with the required fields for this group"
                      : "Select a group to download the template"
                  }
                >
                  <Download className="w-3 h-3" /> Template
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Use our template to ensure your file has the correct format
              </p>
              
              <div className="grid gap-4 p-6 border-2 border-dashed rounded-lg bg-muted/10 mt-4">
                <div className="flex flex-col items-center gap-2 text-center">
                  <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                  <div className="space-y-2">
                    <h3 className="text-base font-medium">Upload Contacts File</h3>
                    {importing ? (
                      <p className="text-sm">Importing contacts...</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Drag & drop your CSV or Excel file, or click to browse
                      </p>
                    )}
                  </div>
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="max-w-xs cursor-pointer"
                    onChange={handleImportContacts}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Required columns: whatsapp_no{" "}
                    {selectTemp && getGroupFields(selectTemp).filter(v => v?.required && !["name", "whatsapp_no"].includes(v.id)).map(f => f.id).join(", ")}
                  </p>
                </div>
              </div>
              
              {importsData.headers.length > 0 && importsData.data.length > 0 && (
                <div className="border rounded-lg mt-4 overflow-hidden">
                  <div className="bg-muted/30 p-3 border-b flex justify-between items-center">
                    <span className="font-medium">Contacts Preview</span>
                    <Badge variant="outline">
                      {selectedImportsData.length}/{importsData.data.length} selected
                    </Badge>
                  </div>
                  
                  <div className="max-h-[300px] overflow-auto">
                    <VirtualTable
                      columns={importsData.headers.map((header) => ({
                        id: header,
                        name: header.split("_").join(" ")?.toUpperCase(),
                        header: header.split("_").join(" ")?.toUpperCase(),
                      }))}
                      data={importsData.data}
                      initialSelected={selectedImportsData}
                      onSelectionChange={(selectedIds) =>
                        setSelectedImportsData(selectedIds)
                      }
                      config={{
                        selectable: true,
                        fixedHeight: "300px",
                        searching: false,
                        sortable: false,
                        leftJsx: null,
                        defaultSort: [],
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="border-t pt-4 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setIsImportContactsOpen(false)}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={handleImportContactsSubmit}
              className="gap-2"
              disabled={!selectTemp || importsData.data.length === 0}
            >
              <Upload className="w-4 h-4" />
              Import {selectedImportsData.length} Contacts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Send Message Dialog */}
      <MessageComposeDialog
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        recipientData={recipientData}
      />
    </div>
  );
}
