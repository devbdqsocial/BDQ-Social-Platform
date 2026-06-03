import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { Breadcrumbs } from "./breadcrumbs";
import { EventSwitcher } from "./event-switcher";
import { CommandPalette } from "./command-palette";
import { NotificationsBell } from "./notifications-bell";

interface Ev { id: string; name: string; status: string }
interface Notif { id: string; title: string; body: string | null; href: string | null; createdAt: Date; readAt: Date | null }

export function AdminHeader({
  active, events, allowed, notifCount, notifItems,
}: {
  active: Ev | null;
  events: Ev[];
  allowed: string[];
  notifCount: number;
  notifItems: Notif[];
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 hidden h-5 md:block" />
      <div className="hidden min-w-0 md:block"><Breadcrumbs /></div>
      <div className="ml-auto flex items-center gap-2">
        <EventSwitcher active={active} events={events} />
        <CommandPalette allowed={allowed} />
        <NotificationsBell count={notifCount} items={notifItems} />
        <ThemeToggle />
      </div>
    </header>
  );
}
