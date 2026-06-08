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

export const NAV_DASHBOARD: NavLeaf = { label: "Dashboard", href: "/dashboard", section: "overview" };

export const NAV_GROUPS: NavGroup[] = [
  { label: "Events", icon: Calendar, items: [
    { label: "All Events", href: "/events", section: "events" },
    { label: "Create Event", href: "/events/new", section: "events" },
    { label: "Past Events", href: "/events/past", section: "events" },
  ]},
  { label: "Venue", icon: Map, items: [
    { label: "All Maps", href: "/maps", section: "map" },
    { label: "Create Map", href: "/maps/new", section: "map" },
    { label: "Map Elements", href: "/elements", section: "map" },
    { label: "Stall Inventory", href: "/stalls", section: "map" },
  ]},
  { label: "Ticketing", icon: Ticket, items: [
    { label: "Orders", href: "/orders", section: "tickets" },
    { label: "Attendees", href: "/attendees", section: "tickets" },
    { label: "Comp Tickets", href: "/comps", section: "comps" },
    { label: "Coupons & Promos", href: "/coupons", section: "coupons" },
  ]},
  { label: "Vendors", icon: Store, items: [
    { label: "Applications", href: "/vendors", section: "vendors" },
    { label: "Add Vendor", href: "/vendors/new", section: "vendors" },
  ]},
  { label: "Operations", icon: Zap, items: [
    { label: "Check-in Scanner", href: "/checkin", section: "checkin" },
    { label: "Live Monitor", href: "/monitor", section: "ops" },
    { label: "Task Center", href: "/tasks", section: "ops" },
    { label: "Staff Management", href: "/staff", section: "staff" },
    { label: "System Health", href: "/ops", section: "ops" },
  ]},
  { label: "Finance", icon: IndianRupee, items: [
    { label: "P&L / ROI", href: "/finance/pnl", section: "finance" },
    { label: "Revenue", href: "/revenue", section: "finance" },
    { label: "Expenses", href: "/finance/expenses", section: "finance" },
    { label: "Budgets", href: "/finance/budgets", section: "finance" },
    { label: "Payments", href: "/payments", section: "finance" },
    { label: "Settlements", href: "/finance/settlements", section: "finance" },
  ]},
  { label: "Growth", icon: TrendingUp, items: [
    { label: "Sponsors", href: "/sponsors", section: "sponsors" },
    { label: "Waitlists", href: "/waitlist", section: "waitlist" },
    { label: "Campaigns", href: "/campaigns", section: "growth" },
  ]},
  { label: "Analytics", icon: BarChart3, items: [
    { label: "Overview", href: "/analytics", section: "analytics" },
    { label: "Funnel & Cohort", href: "/analytics/funnel", section: "analytics" },
    { label: "Sales Timing", href: "/analytics/sales", section: "analytics" },
    { label: "Marketing ROI", href: "/analytics/marketing", section: "analytics" },
    { label: "Products", href: "/analytics/products", section: "analytics" },
    { label: "Attendance", href: "/analytics/attendance", section: "analytics" },
    { label: "Payment Failures", href: "/analytics/failures", section: "analytics" },
    { label: "Vendor Scorecard", href: "/analytics/vendors", section: "analytics" },
    { label: "Customers", href: "/analytics/customers", section: "analytics" },
  ]},
  { label: "System", icon: Settings, items: [
    { label: "Audit Logs", href: "/audit", section: "audit" },
    { label: "Roles & Permissions", href: "/roles", section: "staff" },
    { label: "Notifications", href: "/notifications", section: "overview" },
  ]},
];

export const DASHBOARD_ICON = LayoutDashboard;
