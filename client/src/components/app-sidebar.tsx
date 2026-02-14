import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Search, LayoutDashboard, FileText, Plus, Settings, Shield, Coins } from "lucide-react";
import type { UserProfile } from "@shared/schema";

const menuItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "New Audit", href: "/audits/new", icon: Plus },
  { title: "All Audits", href: "/audits", icon: FileText },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const isAdmin = profile?.role === "admin";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
            <Search className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm" data-testid="text-sidebar-logo">DevSEO AI</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? location === "/"
                    : location.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={`sidebar-${item.title.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.startsWith("/admin")}
                    data-testid="sidebar-admin"
                  >
                    <Link href="/admin">
                      <Shield className="w-4 h-4" />
                      <span>Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Credits:</span>
          <Badge variant="secondary" className="text-xs" data-testid="sidebar-credits">
            {profile?.credits ?? 0}
          </Badge>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-7 h-7">
            <AvatarImage src={user?.profileImageUrl ?? undefined} />
            <AvatarFallback className="text-xs">
              {user?.firstName?.[0] ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-xs font-medium truncate" data-testid="text-sidebar-user">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email ?? ""}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
