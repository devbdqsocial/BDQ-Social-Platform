import {
  LayoutDashboard, Calendar, Map, Ticket, Store, Zap, IndianRupee, TrendingUp, BarChart3, Settings,
  type LucideIcon,
} from "lucide-react";
import type { ConsoleSection } from "@/lib/console-access";

/**
 * Grouped admin navigation. Hrefs point to the CURRENTLY-LIVE routes; as modules migrate to the new
 * IA (P3+), leaves are repointed to the new paths + old paths redirected. Each leaf carries the
 * ConsoleSection used to gate visibility (canAccessSection).
 */

export interface NavLeaf { label: string; href: string; section: ConsoleSection }
export interface NavGroup { label: string; icon: LucideIcon; items: NavLeaf[] }

export const NAV_DASHBOARD: NavLeaf = { label: "Dashboard", href: "/admin", section: "overview" };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Events", icon: Calendar, items: [
    { label: "All Events", href: "/admin/events", section: "events" },
    { label: "Create Event", href: "/admin/events/new", section: "events" },
    { label: "Past Events", href: "/admin/events/past", section: "events" },
  ]},
  { label: "Venue", icon: Map, items: [
    { label: "Map Builder", href: "/admin/venue/map", section: "map" },
    { label: "Stall Inventory", href: "/admin/venue/stalls", section: "map" },
  ]},
  { label: "Ticketing", icon: Ticket, items: [
    { label: "Orders", href: "/admin/tickets/orders", section: "tickets" },
    { label: "Attendees", href: "/admin/tickets/attendees", section: "tickets" },
    { label: "Comp Tickets", href: "/admin/tickets/comps", section: "comps" },
    { label: "Coupons & Promos", href: "/admin/tickets/coupons", section: "coupons" },
  ]},
  { label: "Vendors", icon: Store, items: [
    { label: "Applications", href: "/admin/vendors", section: "vendors" },
  ]},
  { label: "Operations", icon: Zap, items: [
    { label: "Check-in Scanner", href: "/admin/ops/checkin", section: "checkin" },
    { label: "Live Monitor", href: "/admin/ops/monitor", section: "ops" },
    { label: "Task Center", href: "/admin/ops/tasks", section: "ops" },
    { label: "Staff Management", href: "/admin/ops/staff", section: "staff" },
    { label: "System Health", href: "/admin/ops", section: "ops" },
  ]},
  { label: "Finance", icon: IndianRupee, items: [
    { label: "Revenue", href: "/admin/finance/revenue", section: "finance" },
    { label: "Payments", href: "/admin/finance/payments", section: "finance" },
  ]},
  { label: "Growth", icon: TrendingUp, items: [
    { label: "Sponsors", href: "/admin/growth/sponsors", section: "sponsors" },
    { label: "Waitlists", href: "/admin/growth/waitlist", section: "waitlist" },
    { label: "Campaigns", href: "/admin/growth/campaigns", section: "growth" },
  ]},
  { label: "Analytics", icon: BarChart3, items: [
    { label: "Overview", href: "/admin/analytics", section: "analytics" },
  ]},
  { label: "System", icon: Settings, items: [
    { label: "Audit Logs", href: "/admin/system/audit", section: "audit" },
    { label: "Roles & Permissions", href: "/admin/system/roles", section: "staff" },
    { label: "Notifications", href: "/admin/system/notifications", section: "overview" },
  ]},
];

export const DASHBOARD_ICON = LayoutDashboard;
