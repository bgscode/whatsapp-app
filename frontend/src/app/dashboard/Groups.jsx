import { useState } from "react";
import {
  Download,
  Group,
  MoreVertical,
  Search,
  Send,
  Users,
  X,
  FileSpreadsheet,
  Info,
  Filter,
  ChevronDown,
  UploadCloud,
  UserPlus,
  MessagesSquare,
  CheckCircle,
  AlertCircle,
  CheckCheck,
  UserCircle,
  User,
  ArrowDownToLine,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  useAddBulkMembers,
  useAllGroupsExport,
  useGetGroups,
  useGroupsCsvExport,
} from "@/lib/query/groups/queryMutaions";
import { Virtuoso } from "react-virtuoso";
import { MessageComposeDialog } from "@/components/compose/message-compose";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import fileDownload from "js-file-download";
import { Label } from "@/components/ui/label";
import readCSVAndExcel from "@/lib/readCsv&Excel";
import { numberFormat } from "@/lib/utils";
import { useGetSettings } from "@/lib/query/setting/queryMutation";
import toast from "react-hot-toast";

export default function GroupsPage() {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { data } = useGetGroups();
  const { mutate: downloadGroupsByIds } = useGroupsCsvExport();
  const { mutate: downloadAllGroups } = useAllGroupsExport();
  const [importing, setImporting] = useState(false);
  const [importsData, setImportsData] = useState({
    data: [],
    headers: ["whatsapp_no", "member_name"],
  });
  const [selectedImportsData, setSelectedImportsData] = useState([]);
  const [isBulkAddDialogOpen, setIsBulkAddDialogOpen] = useState(false);
  const [bulkAddGroup, setBulkAddGroup] = useState(null);

  const { data: settData } = useGetSettings();
  const country_code = settData?.selectedCountry?.phone[0];
  const groups = data?.groups || [];

  // Calculate statistics from the groups data
  const totalGroupAndMembers = groups?.reduce(
    (acc, group) => {
      acc.groups += 1;
      acc.members += group.member_size;
      return acc;
    },
    { groups: 0, members: 0 }
  );

  // Calculate distribution of members across groups
  const memberDistribution = groups
    .map((group) => ({
      name: group.name,
      count: group.member_size,
      percentage:
        totalGroupAndMembers.members > 0
          ? Math.round((group.member_size / totalGroupAndMembers.members) * 100)
          : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Handle selecting all groups
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedGroups(groups.map((group) => group.group_id));
    } else {
      setSelectedGroups([]);
    }
  };

  // Handle selecting a single group
  const handleSelectGroup = (id) => {
    if (selectedGroups.includes(id)) {
      setSelectedGroups(selectedGroups.filter((groupId) => groupId !== id));
    } else {
      setSelectedGroups([...selectedGroups, id]);
    }
  };

  // Filter groups based on search term
  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle CSV/Excel import for bulk member addition
  const handleImportMembers = async (e) => {
    setImporting(true);
    const file = e.target.files?.[0];

    if (!file) {
      e.target.value = null;
      setImporting(false);
      return;
    }

    toast.loading("Importing members...", { id: "import" });

    try {
      const res = await readCSVAndExcel(file, ["whatsapp_no"]);
      setImportsData(res);
      setSelectedImportsData(res.data || []);
      toast.success(`${res.data.length} members found in file`, {
        id: "import",
      });
    } catch (error) {
      console.error("Error reading file", error);
      toast.error("Error reading file. Please check format.", { id: "import" });
    } finally {
      setImporting(false);
    }
  };

  // Generate and download a CSV template for members
  const handleDownloadTemplate = () => {
    const csvContent =
      "whatsapp_no,member_name\n1234567890,John Doe\n0987654321,Jane Smith\n1122334455,Bob Johnson";
    fileDownload(csvContent, "whatsapp_members_template.csv");
    toast.success("Template downloaded", { duration: 2000 });
  };

  // Trigger bulk add for a single group via the dialog
  const { mutate: addBulkMemeber } = useAddBulkMembers();

  const handleBulkAddSubmit = async () => {
    if (!bulkAddGroup || selectedImportsData.length === 0) {
      toast.error("No members selected or group not specified");
      return;
    }

    const members = selectedImportsData
      .filter((v) => v.whatsapp_no && v.whatsapp_no.trim() !== "")
      .map((m) => numberFormat(m.whatsapp_no, country_code));

    if (members.length === 0) {
      toast.error("No valid WhatsApp numbers found");
      return;
    }

    toast.loading(`Adding ${members.length} members to group...`, {
      id: "add-members",
    });

    addBulkMemeber(
      {
        groupId: bulkAddGroup.group_id,
        members: members,
      },
      {
        onSuccess: () => {
          toast.success(`${members.length} members added successfully!`, {
            id: "add-members",
          });
          setIsBulkAddDialogOpen(false);
          setImportsData({
            data: [],
            headers: ["whatsapp_no", "member_name"],
          });
          setSelectedImportsData([]);
        },
        onError: (error) => {
          console.error("Error adding members:", error);
          toast.error("Failed to add members", { id: "add-members" });
        },
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

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-primary">WhatsApp Groups</h2>
          <p className="text-muted-foreground">
            Manage and message your WhatsApp groups
          </p>
        </div>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={downloadAllGroups}
                >
                  <Download className="w-4 h-4" /> Export All
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Export all groups with their members
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-[2fr,1fr] gap-6">
        {/* Groups Table */}
        <Card className="shadow-sm border-t-4 border-t-primary">
          <CardHeader className="pb-2 bg-muted/20">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Group className="w-5 h-5 text-primary" />
                  Groups
                </CardTitle>
                <CardDescription>
                  View and interact with your WhatsApp groups
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search groups..."
                    className="w-[200px] pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {selectedGroups.length > 0 && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 rounded-lg mb-4">
                <div className="text-sm flex items-center gap-2 text-blue-800 dark:text-blue-300">
                  <CheckCircle className="w-4 h-4" />
                  {selectedGroups.length} group
                  {selectedGroups.length !== 1 ? "s" : ""} selected
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => setIsScheduleOpen(true)}
                  >
                    <MessagesSquare className="w-4 h-4" /> Send Message
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => downloadGroupsByIds(selectedGroups)}
                  >
                    <ArrowDownToLine className="w-4 h-4" /> Export Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedGroups([])}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden">
              <div className="flex items-center p-3 bg-muted/50 border-b">
                <Checkbox
                  checked={
                    selectedGroups.length === groups.length && groups.length > 0
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all groups"
                  className="ml-1 mr-3"
                />
                <div className="flex-1 font-medium text-sm">Group Name</div>
                <div className="flex-1 text-sm font-medium">Members</div>
                <div className="flex-1 text-sm font-medium">Add Permission</div>
                <div className="w-8" />
              </div>

              {filteredGroups.length === 0 ? (
                <div className="text-center py-10">
                  <Group className="w-12 h-12 mx-auto text-muted-foreground/60" />
                  <h3 className="mt-4 text-lg font-medium">No groups found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchTerm
                      ? "Try a different search term"
                      : "No WhatsApp groups available"}
                  </p>
                </div>
              ) : (
                <Virtuoso
                  style={{ height: "400px" }}
                  totalCount={filteredGroups.length}
                  className={`${scrollClass}`}
                  itemContent={(index) => {
                    const group = filteredGroups[index];
                    return (
                      <div
                        key={group.group_id}
                        className="border-b last:border-0"
                      >
                        <div className="flex items-center gap-2 p-3 hover:bg-muted/50">
                          <Checkbox
                            checked={selectedGroups.includes(group.group_id)}
                            onCheckedChange={() =>
                              handleSelectGroup(group.group_id)
                            }
                            aria-label={`Select ${group.name}`}
                            className="ml-1 mr-3"
                          />
                          <div className="flex-1 truncate" title={group.name}>
                            <div className="font-medium">{group.name}</div>
                          </div>
                          <div className="flex-1">
                            <Badge
                              variant="outline"
                              className="bg-primary/5 border-primary/20 text-primary hover:bg-primary/10"
                            >
                              {group.member_size} member
                              {group.member_size !== 1 ? "s" : ""}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            {group.add_permission === 1 ? (
                              <Badge
                                variant="outline"
                                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              >
                                Allowed
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
                              >
                                Restricted
                              </Badge>
                            )}
                          </div>
                          <div className="w-8">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="cursor-pointer"
                                  onClick={() => {
                                    downloadGroupsByIds([group.group_id]);
                                  }}
                                >
                                  <Download className="w-4 h-4 mr-2" /> Export
                                  Members
                                </DropdownMenuItem>
                                {group.add_permission === 1 && (
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                      setBulkAddGroup(group);
                                      setIsBulkAddDialogOpen(true);
                                    }}
                                  >
                                    <UserPlus className="w-4 h-4 mr-2" /> Bulk
                                    Add Members
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </div>
          </CardContent>

          <CardFooter className="flex justify-between py-3 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground">
              Total: {filteredGroups.length} group
              {filteredGroups.length !== 1 ? "s" : ""} with{" "}
              {totalGroupAndMembers.members} members
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={downloadAllGroups}
                  >
                    <Download className="w-3 h-3" /> Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Export all groups with their members
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats Card */}
          <Card className="shadow-sm border-t-4 border-t-green-500">
            <CardHeader className="bg-muted/20 pb-2">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Group Statistics
              </CardTitle>
              <CardDescription>
                Overview of your WhatsApp groups
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/10 p-4 rounded-lg text-center">
                  <Users className="w-6 h-6 mx-auto text-primary mb-1" />
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Members
                  </div>
                  <div className="text-2xl font-bold">
                    {totalGroupAndMembers.members}
                  </div>
                </div>
                <div className="bg-muted/10 p-4 rounded-lg text-center">
                  <Group className="w-6 h-6 mx-auto text-primary mb-1" />
                  <div className="text-sm font-medium text-muted-foreground">
                    Active Groups
                  </div>
                  <div className="text-2xl font-bold">
                    {totalGroupAndMembers.groups}
                  </div>
                </div>
              </div>

              {groups.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <ChevronDown className="w-4 h-4" /> Member Distribution
                    </h3>
                    {memberDistribution.slice(0, 5).map((group) => (
                      <div key={group.name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span
                            className="font-medium truncate"
                            title={group.name}
                          >
                            {group.name}
                          </span>
                          <span className="text-muted-foreground">
                            {group.count} ({group.percentage}%)
                          </span>
                        </div>
                        <Progress value={group.percentage} className="h-1.5" />
                      </div>
                    ))}
                    {memberDistribution.length > 5 && (
                      <div className="text-xs text-center text-muted-foreground mt-2">
                        + {memberDistribution.length - 5} more groups
                      </div>
                    )}
                  </div>
                </>
              )}

              {groups.length > 0 &&
                groups.some((g) => g.add_permission === 1) && (
                  <>
                    <Separator />
                    <Alert className="bg-blue-50 text-blue-800 dark:bg-blue-950/20 dark:text-blue-300 border-blue-200 dark:border-blue-900">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Groups with "Add Permission" enabled allow you to bulk
                        add members. Click the menu on any enabled group to add
                        members.
                      </AlertDescription>
                    </Alert>
                  </>
                )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Message Dialog */}
      <MessageComposeDialog
        isSchedule={true}
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        recipientData={{
          headers: ["name", "members"],
          data:
            groups
              .filter((group) => selectedGroups.includes(group.group_id))
              .map((g) => ({
                name: g.name,
                members: g.member_size,
                whatsapp_no: g.group_id,
                contact_type: "group",
              })) || [],
        }}
      />

      {/* Bulk Add Members Dialog */}
      <Dialog open={isBulkAddDialogOpen} onOpenChange={setIsBulkAddDialogOpen}>
        <DialogContent
          className={`sm:max-w-2xl max-h-[calc(100vh-4rem)] overflow-y-auto ${scrollClass}`}
        >
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Add Members to Group
              </DialogTitle>
              <DialogDescription>
                {bulkAddGroup?.name && (
                  <Badge
                    variant="outline"
                    className="mt-2 bg-primary/5 border-primary/20"
                  >
                    {bulkAddGroup.name}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="flex justify-between items-center">
              <Label className="text-base">Download Template</Label>
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                size="sm"
                className="gap-2"
                title="Download a template with the required fields for adding members"
              >
                <Download className="w-3 h-3" /> Template
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload a CSV/Excel file with WhatsApp numbers to add members in
              bulk
            </p>

            <div className="grid gap-4 p-6 border-2 border-dashed rounded-lg bg-muted/10 mt-2">
              <div className="flex flex-col items-center gap-3 text-center">
                <FileSpreadsheet className="w-10 h-10 text-muted-foreground" />
                <div className="space-y-1">
                  <h3 className="text-base font-medium">Upload Members File</h3>
                  {importing ? (
                    <p className="text-sm">Importing...</p>
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
                  onChange={handleImportMembers}
                />
                <p className="text-xs text-muted-foreground">
                  Required column: whatsapp_no
                </p>
              </div>
            </div>

            {importsData.data.length > 0 && (
              <div className="border rounded-lg overflow-hidden mt-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 border-b">
                  <span className="font-medium text-sm">Members Preview</span>
                  <Badge variant="secondary">
                    {selectedImportsData.length} selected
                  </Badge>
                </div>

                <div className="max-h-[200px] overflow-y-auto">
                  <div className="p-2">
                    {selectedImportsData.slice(0, 10).map((contact, index) => (
                      <div
                        key={index}
                        className="flex items-center p-2 border-b last:border-0"
                      >
                        <User className="w-4 h-4 text-muted-foreground mr-2" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {contact.member_name || "Unnamed"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {contact.whatsapp_no}
                          </div>
                        </div>
                      </div>
                    ))}

                    {selectedImportsData.length > 10 && (
                      <div className="text-center text-xs text-muted-foreground p-2">
                        + {selectedImportsData.length - 10} more members
                      </div>
                    )}

                    {selectedImportsData.length === 0 && (
                      <div className="text-center p-4 text-sm text-muted-foreground">
                        No valid members found
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 border-t pt-4">
            <Button
              variant="ghost"
              onClick={() => setIsBulkAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkAddSubmit}
              className="gap-2"
              disabled={selectedImportsData.length === 0}
            >
              <UserPlus className="w-4 h-4" />
              Add {selectedImportsData.length} Members
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
