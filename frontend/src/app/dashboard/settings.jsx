"use client";
import * as React from "react";
import {
  Save,
  Check,
  ChevronsUpDown,
  CheckCircle,
  Clock,
  TvMinimal,
  Globe,
  AlertCircle,
  Timer,
  Lock,
  BellRing,
  MessageSquare,
  ShieldCheck,
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { countries } from "countries-list";
import {
  useGetSettings,
  useResetSettings,
  useUpdateSettings,
} from "@/lib/query/setting/queryMutation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "react-hot-toast";

export default function SettingsPage() {
  // Notification settings state
  const [notificationPreferences, setNotificationPreferences] = React.useState({
    emailNotifications: true,
    messageDeliveryReports: true,
    campaignCompletion: true,
  });

  // Messaging settings state
  const [messagingPreferences, setMessagingPreferences] = React.useState({
    messageGapEnabled: true,
    gapType: "random",
    fixedGap: 3,
    randomGap: { min: 5, max: 20 },
    batchMessagesEnabled: true,
    batchSize: 10,
    batchIntervalType: "fixed",
    fixedBatchInterval: 30,
    randomBatchInterval: { min: 15, max: 45 },
  });

  // Country selector state
  const getFlagImageUrl = (countryCode) =>
    `https://flagcdn.com/48x36/${countryCode.toLowerCase()}.png`;
  const allCountries = Object.keys(countries)
    .map((k) => ({ ...countries[k], iso: k, flag: getFlagImageUrl(k) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [selectedCountry, setSelectedCountry] = React.useState({
    name: "India",
    native: "भारत",
    phone: [91],
    continent: "AS",
    capital: "New Delhi",
    currency: ["INR"],
    languages: ["hi", "en"],
    iso: "IN",
    flag: "https://flagcdn.com/48x36/in.png",
  });
  const [open, setOpen] = React.useState(false);

  // Activation field: only activation code is needed from the user.
  const [activationCode, setActivationCode] = React.useState("");
  const [licenseMessage, setLicenseMessage] = React.useState("");
  const [isActivating, setIsActivating] = React.useState(false);
  // Updated licenseInfo state now holds extra fields
  const [licenseInfo, setLicenseInfo] = React.useState({
    isVerified: false,
    messagesSent: 0,
    messageLimit: 100,
  });

  const { mutate: updateSetting, isPending: isSaving } = useUpdateSettings();
  const { mutate: resetSetting, isPending: isResetting } = useResetSettings();

  const handleSave = () => {
    const settings = {
      notificationPreferences,
      messagingPreferences,
      selectedCountry,
    };
    toast.promise(
      new Promise((resolve) => {
        updateSetting(settings, {
          onSuccess: () => resolve(),
        });
      }),
      {
        loading: "Saving settings...",
        success: "Settings saved successfully!",
        error: "Failed to save settings",
      }
    );
  };

  // Fetch current status (including license details) from the backend
  const fetchStatus = async () => {
    try {
      const response = await fetch("http://localhost:5000/status");
      const data = await response.json();
      setLicenseInfo({
        isVerified: data.isVerified,
        messagesSent: data.messagesSent,
        messageLimit: data.messageLimit,
        ...data.licenseInfo,
      });
    } catch (error) {
      console.error("Error fetching status:", error);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  // License verification handler – only activation code is sent.
  const handleVerify = async () => {
    if (!activationCode.trim()) {
      toast.error("Please enter an activation code");
      return;
    }

    setIsActivating(true);
    setLicenseMessage("Verifying...");

    try {
      const res = await fetch("http://localhost:5000/license-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationCode }),
      });
      const data = await res.json();
      setLicenseMessage(data.message || "No response");

      if (data.success) {
        toast.success("License activated successfully!");
        // Refresh status so that new license details are updated
        await fetchStatus();
      } else {
        toast.error(data.message || "Failed to activate license");
      }
    } catch (err) {
      console.error(err);
      setLicenseMessage("Error verifying license");
      toast.error("Failed to connect to the server");
    } finally {
      setIsActivating(false);
    }
  };

  const isLifetime =
    (licenseInfo.planType &&
      licenseInfo.planType.toLowerCase() === "lifetime") ||
    !licenseInfo.expiryDate;

  const messageUsagePercentage =
    (licenseInfo.messagesSent / licenseInfo.messageLimit) * 100;

  // Calculate days remaining until expiry
  const getDaysRemaining = () => {
    if (!licenseInfo.expiryDate) return null;

    const today = new Date();
    const expiry = new Date(licenseInfo.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const daysRemaining = getDaysRemaining();

  // Load settings from API on mount
  const { data, isSuccess } = useGetSettings();
  React.useEffect(() => {
    if (data && isSuccess) {
      setNotificationPreferences(
        data.notificationPreferences || notificationPreferences
      );
      setMessagingPreferences(
        data.messagingPreferences || messagingPreferences
      );
      if (data.selectedCountry) setSelectedCountry(data.selectedCountry);
    }
  }, [isSuccess, data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Settings</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => resetSetting()}
            disabled={isResetting || isSaving}
          >
            Reset Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={isResetting || isSaving}
            className="gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="messaging" className="space-y-6">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="messaging" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Messaging</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <BellRing className="w-4 h-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="activation" className="gap-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="hidden sm:inline">License</span>
          </TabsTrigger>
        </TabsList>

        {/* Messaging Tab */}
        <TabsContent value="messaging">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Country Code Selector */}
            <Card className="shadow-sm border-t-4 border-t-primary">
              <CardHeader className="pb-2 bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Country Settings
                </CardTitle>
                <CardDescription>
                  Select your country code for phone number formatting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Label htmlFor="country-select">Country Code</Label>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-10"
                      >
                        {selectedCountry ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={selectedCountry.flag}
                              className="w-6 h-4 object-cover rounded"
                              alt="flag"
                            />
                            <span>{selectedCountry.name}</span>
                            <span className="ml-auto text-muted-foreground text-xs">
                              (+{selectedCountry.phone})
                            </span>
                          </div>
                        ) : (
                          "Select country"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup className="max-h-[300px] overflow-auto">
                            {allCountries.map((country) => (
                              <CommandItem
                                key={country.iso}
                                value={`${country.iso} ${country.name}`}
                                onSelect={() => {
                                  setSelectedCountry(country);
                                  setOpen(false);
                                }}
                              >
                                <div className="flex items-center gap-2 w-full">
                                  <img
                                    src={country.flag}
                                    alt="flag"
                                    className="w-6 h-4 object-cover rounded"
                                  />
                                  <span className="flex-1 truncate">
                                    {country.name}
                                  </span>
                                  <span className="text-muted-foreground text-xs">
                                    (+{country.phone})
                                  </span>
                                </div>
                                <Check
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    selectedCountry?.iso === country.iso
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground">
                    This will be used to format phone numbers correctly
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Protection */}
            <Card className="shadow-sm border-t-4 border-t-primary">
              <CardHeader className="pb-2 bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Account Protection
                </CardTitle>
                <CardDescription>
                  Settings to protect your WhatsApp account from getting banned
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert
                  variant="outline"
                  className="border-amber-200 bg-amber-50 text-amber-800"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    WhatsApp can detect and ban automated messaging. These
                    settings help reduce the risk.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="batch-mode"
                      checked={messagingPreferences.batchMessagesEnabled}
                      onCheckedChange={(checked) =>
                        setMessagingPreferences({
                          ...messagingPreferences,
                          batchMessagesEnabled: checked,
                        })
                      }
                    />
                    <Label htmlFor="batch-mode">Batch Mode</Label>
                  </div>
                  <p className="text-sm text-muted-foreground pl-7">
                    Send messages in smaller batches with pauses between batches
                  </p>
                </div>

                {messagingPreferences.batchMessagesEnabled && (
                  <div className="space-y-4 pl-7">
                    <div className="space-y-2">
                      <Label>Messages Per Batch</Label>
                      <div className="flex items-center justify-between">
                        <Slider
                          value={[messagingPreferences.batchSize]}
                          max={25}
                          min={1}
                          step={1}
                          onValueChange={(val) =>
                            setMessagingPreferences({
                              ...messagingPreferences,
                              batchSize: val[0],
                            })
                          }
                          className="w-[80%]"
                        />
                        <span className="w-10 text-center font-mono bg-muted rounded py-0.5 text-sm">
                          {messagingPreferences.batchSize}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Pause Between Batches (seconds)</Label>
                      <div className="flex items-center justify-between">
                        <Slider
                          value={[messagingPreferences.fixedBatchInterval]}
                          max={120}
                          min={5}
                          step={5}
                          onValueChange={(val) =>
                            setMessagingPreferences({
                              ...messagingPreferences,
                              fixedBatchInterval: val[0],
                            })
                          }
                          className="w-[80%]"
                        />
                        <span className="w-10 text-center font-mono bg-muted rounded py-0.5 text-sm">
                          {messagingPreferences.fixedBatchInterval}s
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message Gap Settings */}
            <Card className="md:col-span-2 shadow-sm border-t-4 border-t-primary">
              <CardHeader className="pb-2 bg-muted/20">
                <CardTitle className="flex items-center gap-2">
                  <Timer className="w-5 h-5 text-primary" />
                  Message Timing
                </CardTitle>
                <CardDescription>
                  Add delays between individual messages to make sending appear
                  more natural
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Message Gap</Label>
                      <p className="text-sm text-muted-foreground">
                        Add time between individual messages
                      </p>
                    </div>
                    <Switch
                      checked={messagingPreferences.messageGapEnabled}
                      onCheckedChange={(checked) =>
                        setMessagingPreferences({
                          ...messagingPreferences,
                          messageGapEnabled: checked,
                        })
                      }
                    />
                  </div>

                  {messagingPreferences.messageGapEnabled && (
                    <div className="space-y-6 pl-6 border-l-2 border-muted">
                      <RadioGroup
                        value={messagingPreferences.gapType}
                        onValueChange={(value) =>
                          setMessagingPreferences({
                            ...messagingPreferences,
                            gapType: value,
                          })
                        }
                        className="grid grid-cols-1 md:grid-cols-2 gap-4"
                      >
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="fixed" id="gap-fixed" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="gap-fixed" className="font-medium">
                              Fixed Duration
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Same delay between each message
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <RadioGroupItem value="random" id="gap-random" />
                          <div className="grid gap-1.5">
                            <Label htmlFor="gap-random" className="font-medium">
                              Random Duration
                              <Badge className="ml-2 bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200">
                                Recommended
                              </Badge>
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Random delay that looks more natural
                            </p>
                          </div>
                        </div>
                      </RadioGroup>

                      <Separator />

                      {messagingPreferences.gapType === "fixed" ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <Label>Gap Duration (seconds)</Label>
                            <span className="w-12 text-center rounded-md border border-input px-2 py-1 text-sm bg-background">
                              {messagingPreferences.fixedGap}s
                            </span>
                          </div>
                          <Slider
                            value={[messagingPreferences.fixedGap]}
                            max={60}
                            min={1}
                            step={1}
                            onValueChange={(val) =>
                              setMessagingPreferences({
                                ...messagingPreferences,
                                fixedGap: val[0],
                              })
                            }
                            className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Minimum (seconds)</Label>
                                <span className="w-12 text-center rounded-md border border-input px-2 py-1 text-sm bg-background">
                                  {messagingPreferences.randomGap.min}s
                                </span>
                              </div>
                              <Slider
                                value={[messagingPreferences.randomGap.min]}
                                max={30}
                                min={1}
                                step={1}
                                onValueChange={(val) =>
                                  setMessagingPreferences({
                                    ...messagingPreferences,
                                    randomGap: {
                                      ...messagingPreferences.randomGap,
                                      min: val[0],
                                      max: Math.max(
                                        messagingPreferences.randomGap.max,
                                        val[0]
                                      ),
                                    },
                                  })
                                }
                                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                              />
                            </div>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Label>Maximum (seconds)</Label>
                                <span className="w-12 text-center rounded-md border border-input px-2 py-1 text-sm bg-background">
                                  {messagingPreferences.randomGap.max}s
                                </span>
                              </div>
                              <Slider
                                value={[messagingPreferences.randomGap.max]}
                                max={60}
                                min={messagingPreferences.randomGap.min}
                                step={1}
                                onValueChange={(val) =>
                                  setMessagingPreferences({
                                    ...messagingPreferences,
                                    randomGap: {
                                      ...messagingPreferences.randomGap,
                                      max: val[0],
                                    },
                                  })
                                }
                                className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                              />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            The system will use a random delay between{" "}
                            {messagingPreferences.randomGap.min} and{" "}
                            {messagingPreferences.randomGap.max} seconds between
                            each message.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="pb-2 bg-muted/20">
              <CardTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Manage how you receive notifications and alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive summaries and alerts via email
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.emailNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        emailNotifications: checked,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Delivery Reports</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about message delivery status
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.messageDeliveryReports}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        messageDeliveryReports: checked,
                      })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Campaign Completion</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications when bulk messaging campaigns
                      complete
                    </p>
                  </div>
                  <Switch
                    checked={notificationPreferences.campaignCompletion}
                    onCheckedChange={(checked) =>
                      setNotificationPreferences({
                        ...notificationPreferences,
                        campaignCompletion: checked,
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activation Tab – only activation code is needed */}
        <TabsContent value="activation">
          {licenseInfo.isVerified ? (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="shadow-sm border-t-4 border-t-primary">
                <CardHeader className="pb-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-green-600" />
                      License Status
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Active</span>
                    </Badge>
                  </div>
                  <CardDescription>
                    Your license is verified and active
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">Plan Type</p>
                      <p className="font-medium text-base">
                        {licenseInfo.planType || "Standard"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">
                        {isLifetime ? "Valid Until" : "Expires On"}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium text-base">
                          {isLifetime
                            ? "Lifetime"
                            : new Date(
                                licenseInfo.expiryDate
                              ).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                        </p>
                      </div>
                      {!isLifetime && daysRemaining !== null && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs mt-1",
                            daysRemaining > 30
                              ? "bg-green-50 text-green-700 border-green-200"
                              : daysRemaining > 7
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          )}
                        >
                          {daysRemaining} days remaining
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Message Usage</p>
                      <p className="text-sm text-muted-foreground">
                        {licenseInfo.messagesSent} / {licenseInfo.messageLimit}
                      </p>
                    </div>
                    <Progress
                      value={messageUsagePercentage}
                      className={cn(
                        "h-2",
                        messageUsagePercentage > 90
                          ? "bg-red-100"
                          : messageUsagePercentage > 75
                          ? "bg-amber-100"
                          : "bg-green-100"
                      )}
                    />
                    <p className="text-xs text-muted-foreground">
                      {licenseInfo.messageLimit - licenseInfo.messagesSent}{" "}
                      messages remaining in your plan
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-t-4 border-t-primary">
                <CardHeader className="pb-2 bg-muted/20">
                  <CardTitle className="flex items-center gap-2">
                    <TvMinimal className="h-5 w-5 text-primary" />
                    Activated Devices
                  </CardTitle>
                  <CardDescription>
                    Devices where this license is currently activated
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {licenseInfo.devices && licenseInfo.devices.length > 0 ? (
                    licenseInfo.devices.map((device, index) => (
                      <div
                        key={index}
                        className={cn(
                          "rounded-lg border p-3",
                          index === 0 ? "bg-primary/5 border-primary/10" : ""
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">
                              {device.name || "Unknown device"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              ID: {device.hardwareId?.substring(0, 16)}...
                            </p>
                          </div>
                          {index === 0 && (
                            <Badge
                              variant="outline"
                              className="bg-primary/10 text-primary border-primary/20"
                            >
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Activated:{" "}
                          {new Date(device.activatedAt).toLocaleDateString(
                            undefined,
                            { year: "numeric", month: "short", day: "numeric" }
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No devices are currently activated
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end pt-0">
                  <p className="text-xs text-muted-foreground">
                    Your license allows for {licenseInfo.maxDevices || 1}{" "}
                    device(s)
                  </p>
                </CardFooter>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>License Activation</CardTitle>
                  <Badge
                    variant="outline"
                    className="bg-amber-50 text-amber-700 border-amber-200"
                  >
                    Required
                  </Badge>
                </div>
                <CardDescription>
                  Enter your activation code to verify your license
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert
                  variant="outline"
                  className="border-primary/20 bg-primary/5"
                >
                  <Lock className="h-4 w-4" />
                  <AlertTitle>License Required</AlertTitle>
                  <AlertDescription>
                    A valid license is required to unlock all features and
                    continue using WhatsApp Blaster.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2 pt-2">
                  <Label htmlFor="activation-code">Activation Code</Label>
                  <Input
                    id="activation-code"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Enter your activation code"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your activation code was sent to your email after purchase
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleVerify}
                    className="gap-2"
                    disabled={isActivating || !activationCode.trim()}
                  >
                    {isActivating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Activate License
                      </>
                    )}
                  </Button>
                </div>

                {licenseMessage && (
                  <p className="text-sm pt-2 text-center">{licenseMessage}</p>
                )}
              </CardContent>
              <CardFooter className="flex flex-col items-start gap-2">
                <p className="text-sm">
                  Don't have a license?{" "}
                  <a href="#" className="text-primary hover:underline">
                    Purchase one here
                  </a>
                </p>
                <p className="text-sm">
                  Having trouble?{" "}
                  <a href="#" className="text-primary hover:underline">
                    Contact support
                  </a>
                </p>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
