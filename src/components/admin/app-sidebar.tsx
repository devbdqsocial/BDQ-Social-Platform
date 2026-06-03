"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { DASHBOARD_ICON, NAV_DASHBOARD, NAV_GROUPS, type NavGroup } from "./nav-config";
import { UserMenu } from "./user-menu";

export function AppSidebar({ allowed }: { allowed: string[] }) {
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
      <SidebarHeader>
        <Link href="/admin" className="flex items-center gap-2 px-2 py-1.5 font-semibold">
          <ShieldCheck className="size-5 shrink-0 text-primary" />
          <span className="truncate group-data-[collapsible=icon]:hidden">BDQ Admin</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive(dashboard.href)} tooltip={dashboard.label}>
                <Link href={dashboard.href}><DASHBOARD_ICON /> <span>{dashboard.label}</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {groups.map((g) => (
              <Collapsible key={g.label} asChild defaultOpen={groupActive(g)} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={g.label}>
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
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
