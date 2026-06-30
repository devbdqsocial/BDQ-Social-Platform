import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { env } from "@/lib/env";
import { VendorRail } from "@/components/vendor/VendorRail";
import { MaskDefs } from "@/components/motion/MaskDefs";
import { SignOutButton } from "@/components/auth/SignOutButton";

const NAV = [
  { href: "/vendor/home", label: "Home" },
  { href: "/vendor/events", label: "Book a stall" },
  { href: "/vendor/add-ons", label: "Add-ons" },
  { href: "/vendor/offers", label: "Offers" },
  { href: "/vendor/leads", label: "Leads" },
  { href: "/vendor/profile", label: "Brand profile" },
  { href: "/vendor/documents", label: "Documents" },
  { href: "/vendor/contract", label: "Contract" },
];

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  // Backstop authz for the whole authenticated portal (login lives outside this route group).
  // Per-page requireVendor() guards remain — a layout must not be the only gate.
  const session = await getSession();
  const devBypass = env.DEV_VENDOR && process.env.NODE_ENV !== "production";
  const ok = session && (session.role === "VENDOR" || session.role === "SUPER_ADMIN");
  if (!ok && !devBypass) redirect("/vendor/login");

  const footerLink =
    "f-paragraph-small rounded-md px-3 py-2 text-left font-bold opacity-75 transition-opacity hover:opacity-100";

  return (
    <div
      className="bdq flex min-h-dvh flex-col sm:flex-row"
      style={{ background: "var(--bgcolor)", color: "var(--color)" }}
    >
      <MaskDefs />
      <VendorRail
        items={NAV}
        footer={
          <div className="flex flex-col gap-1" style={{ color: "var(--light-blue)" }}>
            <Link href="/?zone=public" className={footerLink}>
              View site
            </Link>
            <SignOutButton className={footerLink} />
          </div>
        }
      />
      <main id="main" className="min-w-0 flex-1 p-[var(--space-lg)] sm:p-[var(--space-2xl)]">
        {children}
      </main>
    </div>
  );
}
