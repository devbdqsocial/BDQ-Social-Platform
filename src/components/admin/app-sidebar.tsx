"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Plus, ShieldCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu,
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-2">
        <Link href="/admin" className="flex items-center gap-2 px-1 py-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="size-4" />
          </span>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">BDQ Admin</span>
            <span className="text-xs text-muted-foreground">Console</span>
          </div>
        </Link>
        <Button asChild size="sm" variant="outline" className="w-full justify-start gap-2 group-data-[collapsible=icon]:hidden">
          <Link href="/admin/events/new"><Plus className="size-4" /> Quick create</Link>
        </Button>
      </SidebarHeader>

      <SidebarSeparator className="mx-0" />

      <SidebarContent>
        <SidebarGroup className="px-2 py-1.5">
          <SidebarMenu className="gap-1.5">
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive(dashboard.href)} tooltip={dashboard.label}>
                <Link href={dashboard.href}><DASHBOARD_ICON /> <span>{dashboard.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {groups.map((g) => (
              <Collapsible key={g.label} asChild defaultOpen={groupActive(g)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={g.label} isActive={groupActive(g)}>
                      <g.icon /> <span>{g.label}</span>
                      <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {g.items.map((it) => (
                        <SidebarMenuSubItem key={it.href}>
                          <SidebarMenuSubButton asChild isActive={isActive(it.href)}>
                            <Link href={it.href}>{it.label}</Link>
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
      </SidebarContent>

      <SidebarFooter>
        <UserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
