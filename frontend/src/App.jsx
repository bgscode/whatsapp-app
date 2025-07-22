import * as React from "react";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCcw,
  Smartphone,
  Loader2,
  QrCode,
  ExternalLink,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function App() {
  const queryClient = useQueryClient();
  const [refetchInterval, setRefetchInterval] = React.useState(2000);

  // Use React Query for fetching QR code
  const {
    data: qrData,
    isLoading: isQrLoading,
    refetch: refetchQrCode,
    isError: isQrError,
  } = useQuery({
    queryKey: ["qrCode"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000/connect");
      return response.json();
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Use React Query for status checking
  const {
    data: statusData,
    isLoading: isStatusLoading,
    isError: isStatusError,
  } = useQuery({
    queryKey: ["connectionStatus"],
    queryFn: async () => {
      const response = await fetch("http://localhost:5000/status");
      return response.json();
    },
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Update refetchInterval based on statusData
  React.useEffect(() => {
    if (statusData?.isAuthenticated) {
      setRefetchInterval(false);
    } else {
      setRefetchInterval(2000);
    }
  }, [statusData]);

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      return await fetch("http://localhost:5000/logout", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qrCode"] });
      queryClient.invalidateQueries({ queryKey: ["connectionStatus"] });
    },
  });

  // Determine the current connection status
  const getConnectionStatus = () => {
    if (isQrLoading || isStatusLoading) return "connecting";
    if (isQrError || isStatusError) return "disconnected";
    if (statusData?.isAuthenticated) return "connected";
    return "waiting";
  };

  const status = getConnectionStatus();

  // Handle the refresh QR code action
  const handleRefreshQrCode = () => {
    refetchQrCode();
  };

  // Handle logout action
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get QR code data
  const qrCode = qrData?.qr || "";

  // Get license information
  const licenseInfo = {
    isVerified: statusData?.isVerified || false,
    messagesSent: statusData?.messagesSent || 0,
    messageLimit: statusData?.messageLimit || 100,
    planType: statusData?.licenseInfo?.planType || "Free",
  };

  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-4xl mx-auto">
        {/* <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
            WA Boss
          </h1>
          <p className="text-muted-foreground mt-2">
            Connect your WhatsApp account to start managing your groups and
            messages
          </p>
        </div> */}

        <div className="grid lg:grid-cols-[1fr,1.5fr] gap-6">
          {/* QR Code Card */}
          <Card className="shadow-sm border-t-4 border-t-primary">
            <CardHeader className="bg-muted/20 pb-2">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                WhatsApp Connection
              </CardTitle>
              <CardDescription>
                Scan the QR code with your phone
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 flex flex-col items-center space-y-6">
              <div className="relative">
                {status === "connected" ? (
                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center bg-green-500/10 text-green-500 border border-green-500/20 w-64 h-64 rounded-xl shadow-inner">
                      <CheckCircle2 className="w-32 h-32 mx-auto text-green-500 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl shadow-md">
                    {qrCode && status !== "connecting" ? (
                      <img
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        className="w-64 h-64 border border-gray-200 rounded-xl"
                      />
                    ) : (
                      <div className="w-64 h-64 rounded-xl border border-gray-200 shadow-md flex items-center justify-center bg-gray-50">
                        {status === "connecting" ? (
                          <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        ) : (
                          <Skeleton className="w-full h-full rounded-xl" />
                        )}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10 pointer-events-none"></div>
                  </div>
                )}
              </div>

              {/* <div>
                <Badge
                  variant={status === "connected" ? "default" : "secondary"}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full ${
                    status === "connected"
                      ? "bg-green-500 text-white"
                      : status === "waiting"
                      ? "bg-amber-500/10 text-amber-600 border border-amber-200"
                      : status === "disconnected"
                      ? "bg-red-500/10 text-red-600 border border-red-200"
                      : "bg-blue-500/10 text-blue-600 border border-blue-200"
                  }`}
                >
                  {status === "connected"
                    ? "Connected"
                    : status === "waiting"
                    ? "Scan the QR Code"
                    : status === "disconnected"
                    ? "Connection Error"
                    : "Connecting..."}
                </Badge>
              </div> */}

              <div className="flex gap-3 justify-center">
                {status !== "connected" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                          onClick={handleRefreshQrCode}
                          disabled={isQrLoading || logoutMutation.isPending}
                        >
                          {isQrLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCcw className="w-4 h-4" />
                          )}
                          Refresh QR Code
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Generate a new QR code</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {status === "connected" && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition-all"
                          onClick={handleLogout}
                          disabled={logoutMutation.isPending}
                        >
                          {logoutMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          Logout
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Disconnect WhatsApp</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardContent>

            {status === "connected" && (
              <CardFooter className="bg-muted/10 border-t py-3">
                <p className="text-sm text-center w-full text-green-600 font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>WhatsApp Connected Successfully</span>
                </p>
              </CardFooter>
            )}
          </Card>

          {/* Info Card */}
          <div className="space-y-6">
            <Card className="shadow-sm border-t-4 border-t-blue-500">
              <CardHeader className="bg-muted/20 pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  Connection Guide
                </CardTitle>
                <CardDescription>
                  How to connect your WhatsApp account
                </CardDescription>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <Smartphone className="h-4 w-4 text-blue-500" />
                  <AlertTitle className="text-blue-700 font-medium">
                    How to connect
                  </AlertTitle>
                  <AlertDescription className="mt-2 text-sm text-blue-600">
                    <ol className="space-y-1 list-decimal pl-5">
                      <li>Open WhatsApp on your phone</li>
                      <li>Tap Menu or Settings and select WhatsApp Web</li>
                      <li>
                        Point your phone to this screen to capture the QR code
                      </li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {status === "connected" ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertTitle className="text-green-700 font-medium">
                      Success!
                    </AlertTitle>
                    <AlertDescription className="text-green-600">
                      Your WhatsApp account is now connected. You can start
                      using WA Boss.
                    </AlertDescription>
                  </Alert>
                ) : status === "disconnected" ? (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertTitle className="text-red-700">
                      Connection Error
                    </AlertTitle>
                    <AlertDescription className="text-red-600">
                      There was a problem connecting to the server. Please check
                      your connection and try again.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <AlertTitle className="text-amber-700 font-medium">
                      Waiting for connection
                    </AlertTitle>
                    <AlertDescription className="text-amber-600">
                      Scan the QR code with your phone to connect your WhatsApp
                      account.
                    </AlertDescription>
                  </Alert>
                )}

                <Card className="border p-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        License Status
                      </h3>
                      {licenseInfo.isVerified && (
                        <Badge
                          variant="outline"
                          className="bg-green-100 text-green-800 border-green-200"
                        >
                          Verified
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {licenseInfo.isVerified ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>PRO License</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          Plan: {licenseInfo.planType}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-amber-600 flex items-center gap-1">
                          <Gauge className="h-4 w-4" />
                          <span>FREEMIUM</span>
                        </p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>Message usage</span>
                            <span className="text-muted-foreground">
                              {licenseInfo.messagesSent} /{" "}
                              {licenseInfo.messageLimit}
                            </span>
                          </div>
                          <Progress
                            value={
                              (licenseInfo.messagesSent /
                                licenseInfo.messageLimit) *
                              100
                            }
                            className="h-2"
                          />
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          <span>Upgrade for unlimited messages</span>
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              </CardContent>
            </Card>
          </div>
        </div>

        {isQrError || isStatusError ? (
          <Alert className="bg-red-50 border-red-200 mt-6">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertTitle className="text-red-700">Connection Error</AlertTitle>
            <AlertDescription className="text-red-600">
              There was a problem connecting to the server. Please check your
              connection and try again.
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-center text-amber-600 text-sm mt-6">
            Note: If the QR code is not loading, please click the Refresh
            button.
          </p>
        )}
      </div>
    </div>
  );
}
