import * as React from "react";
import {
  MessageCircle,
  FileText,
  Users,
  UserCircle,
  Calendar,
  Settings,
  BarChart2,
  SendHorizontal,
  QrCode,
} from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useGetProfile } from "@/lib/query/me/queryMutaion";

// Navigation items with consistent naming and better organization
const data = {
  user: {
    name: "User",
    email: "",
    avatar: "",
  },
  teams: [
    {
      name: "WhatsApp Blaster",
      logo: MessageCircle,
      plan: "Pro",
    },
  ],
  navMain: [
    {
      title: "Connection",
      url: "/setup",
      icon: QrCode,
    },
    {
      title: "Compose",
      url: "/dashboard",
      icon: SendHorizontal,
    },
    {
      title: "Templates",
      url: "/templates",
      icon: FileText,
    },
    {
      title: "Contacts",
      url: "/contacts",
      icon: UserCircle,
    },
    {
      title: "Groups",
      url: "/groups",
      icon: Users,
    },
    {
      title: "Schedule",
      url: "/schedule",
      icon: Calendar,
    },
    {
      title: "Analytics",
      url: "/logs",
      icon: BarChart2,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { data: profileData } = useGetProfile();

  // Update user data if profile is available
  if (profileData) {
    data.user.name = profileData?.name || "User";
    data.user.email = profileData?.number || "";
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data?.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data?.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data?.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
