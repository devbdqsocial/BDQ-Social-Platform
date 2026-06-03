"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function UserMenu() {
  const router = useRouter();
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <span className="grid size-8 place-items-center rounded-md bg-sidebar-accent"><UserRound className="size-4" /></span>
              <span className="flex-1 truncate text-left">Admin</span>
              <ChevronsUpDown className="ml-auto size-4 opacity-60" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-(--radix-popper-anchor-width)">
            <DropdownMenuItem onClick={signOut}><LogOut className="size-4" /> Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
