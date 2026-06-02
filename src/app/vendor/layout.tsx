import { ZoneSidebar } from "@/components/nav/ZoneSidebar";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/profile", label: "Brand profile" },
  { href: "/vendor/events", label: "Book a stall" },
  { href: "/vendor/contract", label: "Contract" },
  { href: "/vendor/leads", label: "Leads" },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col sm:flex-row">
      <ZoneSidebar variant="vendor" brand="Vendor" items={NAV} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="hidden h-14 items-center justify-between border-b border-border px-6 sm:flex">
          <span className="text-sm text-muted-foreground">Vendor portal</span>
          <ThemeToggle />
        </header>
        <main id="main" className="p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
