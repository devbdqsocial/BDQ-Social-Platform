"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Plus, Command, Mail } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarRail, SidebarSeparator,
} from "@/components/ui/sidebar";
import { DASHBOARD_ICON, NAV_DASHBOARD, NAV_GROUPS, type NavGroup } from "./nav-config";
import { UserMenu } from "./user-menu";

export function AppSidebar({ allowed, user }: { allowed: string[]; user: { name: string | null; email: string | null } }) {
  const pathname = usePathname();
  const allow = new Set(allowed);
  const dashboard = NAV_DASHBOARD;
  const groups: NavGroup[] = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => allow.has(i.section)) }))
    .filter((g) => g.items.length > 0);
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
  const groupActive = (g: NavGroup) => g.items.some((i) => isActive(i.href));
  // Single-open accordion: opening one group collapses the others. Defaults to the active route's group.
  const [openGroup, setOpenGroup] = useState<string | null>(() => groups.find(groupActive)?.label ?? null);

  // Split into Console (Dashboards) and Administration (Pages/Management)
  const consoleGroupLabels = ["Events", "Venue", "Ticketing", "Vendors"];
  const consoleGroups = groups.filter((g) => consoleGroupLabels.includes(g.label));
  const managementGroups = groups.filter((g) => !consoleGroupLabels.includes(g.label));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3 px-3 py-4 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <Link href="/admin" className="flex items-center gap-2.5 px-1.5 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* Logo Placeholder: Replace <Command /> with <img src="/logo.png" className="size-5" /> in the future */}
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground ring-1 ring-sidebar-border">
            <Command className="size-4" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-wide text-sidebar-primary">BDQ Social Admin</span>
            <span className="text-[10px] font-medium text-sidebar-foreground/60">Console</span>
          </div>
        </Link>
        <div className="flex items-center gap-2 w-full mt-1 group-data-[collapsible=icon]:hidden">
          <Button asChild size="sm" variant="outline" className="flex-1 justify-start gap-2 bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground border-sidebar-border hover:border-sidebar-ring h-9 rounded-md px-3 font-normal text-xs transition-all duration-150">
            <Link href="/admin/events/new">
              <Plus className="size-3.5 rounded-full border border-sidebar-foreground/50 hover:border-sidebar-accent-foreground p-0.5" />
              <span>Quick Create</span>
            </Link>
          </Button>
          <Button asChild size="icon" variant="outline" className="size-9 bg-sidebar-accent/50 hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-accent-foreground border-sidebar-border hover:border-sidebar-ring rounded-md shrink-0 transition-all duration-150">
            <Link href="/admin/system/notifications">
              <Mail className="size-4" />
            </Link>
          </Button>
        </div>
      </SidebarHeader>

      <SidebarSeparator className="mx-0 opacity-50" />

      <SidebarContent className="px-2 py-3">
        {/* Dashboards Section */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest text-[#3b82f6]/95 uppercase px-3.5 mb-2 group-data-[collapsible=icon]:hidden">
            Dashboards
          </SidebarGroupLabel>
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive(dashboard.href)} tooltip={dashboard.label} className="px-3.5">
                <Link href={dashboard.href}><DASHBOARD_ICON className="size-4" /> <span>{dashboard.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {consoleGroups.map((g) => (
              <Collapsible
                key={g.label}
                asChild
                open={openGroup === g.label}
                onOpenChange={(o) => setOpenGroup(o ? g.label : null)}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={g.label} className="px-3.5">
                      <g.icon className="size-4" /> <span>{g.label}</span>
                      <ChevronRight className="ml-auto size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90 text-sidebar-foreground/50" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub className="ml-6 border-l border-sidebar-border pl-3">
                      {g.items.map((it) => (
                        <SidebarMenuSubItem key={it.href}>
                          <SidebarMenuSubButton asChild isActive={isActive(it.href)}>
                            <Link href={it.href} className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors">{it.label}</Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Management Section */}
        {managementGroups.length > 0 && (
          <SidebarGroup className="p-0 mt-5">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-widest text-[#3b82f6]/95 uppercase px-3.5 mb-2 group-data-[collapsible=icon]:hidden">
              Management
            </SidebarGroupLabel>
            <SidebarMenu className="gap-1">
              {managementGroups.map((g) => (
                <Collapsible
                  key={g.label}
                  asChild
                  open={openGroup === g.label}
                  onOpenChange={(o) => setOpenGroup(o ? g.label : null)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={g.label} className="px-3.5">
                        <g.icon className="size-4" /> <span>{g.label}</span>
                        <ChevronRight className="ml-auto size-3.5 transition-transform group-data-[state=open]/collapsible:rotate-90 text-sidebar-foreground/50" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-6 border-l border-neutral-800/80 pl-3">
                        {g.items.map((it) => (
                          <SidebarMenuSubItem key={it.href}>
                            <SidebarMenuSubButton asChild isActive={isActive(it.href)}>
                              <Link href={it.href} className="text-neutral-400 hover:text-white transition-colors">{it.label}</Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
