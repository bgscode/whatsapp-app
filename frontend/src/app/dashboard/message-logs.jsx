// MessageLogs.jsx
import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  BarChart3,
  MessageSquare,
  Calendar,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { useGetMessageLogs } from "@/lib/query/message-logs/queryMutaion";
import VirtualTable from "@/components/table";
import { Bar, BarChart, XAxis, Tooltip } from "recharts";

export default function MessageLogs() {
  const [activeTab, setActiveTab] = useState("logs");
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [autoRefresh, setAutoRefresh] = useState(60);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    scheduled: 0,
    failed: 0,
    pending: 0,
    deliveryRate: 0,
  });

  const {
    data,
    isPending: isLoading,
    refetch: handleRefresh,
    isSuccess,
  } = useGetMessageLogs();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (autoRefresh === 0) {
        handleRefresh();
        setAutoRefresh(60);
      } else {
        setAutoRefresh(autoRefresh - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [autoRefresh, handleRefresh]);

  useEffect(() => {
    if (!isSuccess) return;
    setLogs(data);
    const total = data.length;
    const sent = data.filter((log) => log.status === "sent").length;
    const scheduled = data.filter((log) => log.status === "scheduled").length;
    const failed = data.filter((log) => log.status === "failed").length;
    const pending = data.filter((log) => log.status === "pending").length;
    setStats({
      total,
      sent,
      scheduled,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round((sent / total) * 100) : 0,
    });
  }, [isSuccess, data]);

  useEffect(() => {
    let filtered = [...logs];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (log.name || "").toLowerCase().includes(term) ||
          (log.whatsapp_no || "").includes(term) ||
          (log.message || "").toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }
    if (dateRange?.from) {
      filtered = filtered.filter((log) => {
        const created = new Date(log.created_at);
        return created >= dateRange.from;
      });
    }
    if (dateRange?.to) {
      const endDate = new Date(dateRange.to);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter((log) => {
        const created = new Date(log.created_at);
        return created <= endDate;
      });
    }
    setFilteredLogs(filtered);
  }, [logs, searchTerm, statusFilter, dateRange]);

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setDateRange({ from: null, to: null });
  };

  function renderStatusBadge(status) {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" /> Sent
          </Badge>
        );
      case "scheduled":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600">
            <Clock className="w-3 h-3 mr-1" /> Scheduled
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500 hover:bg-red-600">
            <XCircle className="w-3 h-3 mr-1" /> Failed
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  }

  const weeklyChartData = useMemo(() => {
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 6);
    const dataMap = {};
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const key = format(new Date(d), "yyyy-MM-dd");
      dataMap[key] = {
        date: key,
        sent: 0,
        scheduled: 0,
        failed: 0,
        pending: 0,
      };
    }
    logs.forEach((log) => {
      const logDate = new Date(log.created_at);
      const key = format(logDate, "yyyy-MM-dd");
      if (dataMap[key]) {
        if (log.status === "sent") dataMap[key].sent += 1;
        else if (log.status === "scheduled") dataMap[key].scheduled += 1;
        else if (log.status === "failed") dataMap[key].failed += 1;
        else if (log.status === "pending") dataMap[key].pending += 1;
      }
    });
    return Object.values(dataMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [logs]);

  const chartConfig = {
    sent: { label: "Sent", color: "#4CAF50" },
    scheduled: { label: "Scheduled", color: "#2196F3" },
    failed: { label: "Failed", color: "#F44336" },
    pending: { label: "Pending", color: "#FFC107" },
  };

  const ClickReprtCard = (status) => {
    setStatusFilter(status);
    setActiveTab("logs");
  };

  return (
    <div className="container mx-auto space-y-2">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Message Reports</h1>
        <Button onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
          />
          Auto Refresh {autoRefresh}s
        </Button>
      </div>

      <Tabs defaultValue="logs" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="logs">
            <MessageSquare className="w-4 h-4 mr-2" />
            Message Logs
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports & Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          <Card className="shadow-sm border-t-4 border-t-secondary">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-3 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search by name, number or message content..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        {dateRange?.from ? (
                          dateRange?.to ? (
                            <>
                              {format(dateRange.from, "LLL dd")} -{" "}
                              {format(dateRange.to, "LLL dd")}
                            </>
                          ) : (
                            format(dateRange.from, "LLL dd, yyyy")
                          )
                        ) : (
                          "Date Range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                  <Button variant="ghost" onClick={clearFilters}>
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="pb-2 bg-muted/20">
              <CardTitle>Message History</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} of {logs.length} messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VirtualTable
                columns={[
                  {
                    name: "name",
                    header: "Recipient",
                    width: "200px",
                    render: (id, row) => (
                      <div>
                        {row.name || "Unknown"}
                        <div className="text-sm text-gray-500">
                          {row.whatsapp_no}
                        </div>
                      </div>
                    ),
                  },
                  {
                    name: "message",
                    width: "300px",
                    header: "Message",
                    render: (id, row) => row.message.slice(0, 30) + "...",
                  },
                  {
                    name: "status",
                    header: "Status",
                    width: "200px",
                    render: (id, row) => (
                      <div>
                        {renderStatusBadge(row.status)}
                        {row.status === "failed" && row.error_message && (
                          <div className="text-xs text-red-500 mt-1">
                            {row.error_message}
                          </div>
                        )}
                        {row.status === "scheduled" &&
                          row.schedule_date &&
                          row.schedule_time && (
                            <div className="text-xs text-blue-500 mt-1">
                              {row.schedule_date} {row.schedule_time}
                            </div>
                          )}
                      </div>
                    ),
                  },
                  {
                    name: "created_at",
                    header: "Date",
                    width: "200px",
                    render: (id, row) =>
                      format(new Date(row.created_at), "MMM dd, yyyy HH:mm"),
                  },
                  {
                    name: "actions",
                    header: "Actions",
                    render: (id, row) => (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          {row.status === "failed" && (
                            <DropdownMenuItem>Retry</DropdownMenuItem>
                          )}
                          {row.status === "scheduled" && (
                            <DropdownMenuItem>Cancel</DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ),
                  },
                ]}
                data={filteredLogs}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card
              onClick={() => ClickReprtCard("all")}
              className="cursor-pointer shadow-sm border-l-4 border-l-secondary"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium">
                  Total Messages
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-gray-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-gray-500">
                  All messages in the system
                </p>
              </CardContent>
            </Card>
            <Card
              onClick={() => ClickReprtCard("sent")}
              className="cursor-pointer shadow-sm border-l-4 border-l-green-500"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium">
                  Successfully Sent
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-500">
                  {stats.sent}
                </div>
                <p className="text-xs text-gray-500">
                  {stats.deliveryRate}% delivery rate
                </p>
              </CardContent>
            </Card>
            <Card
              onClick={() => ClickReprtCard("scheduled")}
              className="cursor-pointer shadow-sm border-l-4 border-l-blue-500"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">
                  {stats.scheduled}
                </div>
                <p className="text-xs text-gray-500">Pending delivery</p>
              </CardContent>
            </Card>
            <Card
              onClick={() => ClickReprtCard("pending")}
              className="cursor-pointer shadow-sm border-l-4 border-l-yellow-500"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-500">
                  {stats.pending}
                </div>
                <p className="text-xs text-gray-500">
                  Messages awaiting processing
                </p>
              </CardContent>
            </Card>
            <Card
              onClick={() => ClickReprtCard("failed")}
              className="cursor-pointer shadow-sm border-l-4 border-l-red-500"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
                <XCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-500">
                  {stats.failed}
                </div>
                <p className="text-xs text-gray-500">
                  {stats.total > 0
                    ? Math.round((stats.failed / stats.total) * 100)
                    : 0}
                  % failure rate
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="pb-2 bg-muted/20">
              <CardTitle>Weekly Message Report</CardTitle>
              <CardDescription>
                Message delivery statistics for the past 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              {weeklyChartData.length > 0 ? (
                <BarChart width={600} height={300} data={weeklyChartData}>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        weekday: "short",
                      })
                    }
                  />
                  <Tooltip cursor={false} />
                  <Bar
                    dataKey={chartConfig.sent.label.toLowerCase()}
                    stackId="a"
                    fill={chartConfig.sent.color}
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey={chartConfig.scheduled.label.toLowerCase()}
                    stackId="a"
                    fill={chartConfig.scheduled.color}
                  />
                  <Bar
                    dataKey={chartConfig.pending.label.toLowerCase()}
                    stackId="a"
                    fill={chartConfig.pending.color}
                  />
                  <Bar
                    dataKey={chartConfig.failed.label.toLowerCase()}
                    stackId="a"
                    fill={chartConfig.failed.color}
                    radius={[0, 0, 4, 4]}
                  />
                </BarChart>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <p>No data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-primary/60">
            <CardHeader className="pb-2 bg-muted/20">
              <CardTitle>Top Recipients</CardTitle>
              <CardDescription>
                Recipients with the most messages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...new Set(logs.map((log) => log.name || "Unknown"))]
                  .slice(0, 5)
                  .map((recipient, index) => {
                    const recipientLogs = logs.filter(
                      (log) => (log.name || "Unknown") === recipient
                    );
                    const total = recipientLogs.length;
                    const sent = recipientLogs.filter(
                      (log) => log.status === "sent"
                    ).length;
                    const failed = recipientLogs.filter(
                      (log) => log.status === "failed"
                    ).length;
                    const pending = recipientLogs.filter(
                      (log) => log.status === "pending"
                    ).length;
                    return (
                      <div key={index} className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                          {recipient.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{recipient}</p>
                          <div className="flex gap-2 text-xs text-gray-500">
                            <span>{total} messages</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-green-500">{sent} sent</span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-yellow-500">
                              {pending} pending
                            </span>
                            <Separator orientation="vertical" className="h-4" />
                            <span className="text-red-500">
                              {failed} failed
                            </span>
                          </div>
                        </div>
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(sent / total) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
