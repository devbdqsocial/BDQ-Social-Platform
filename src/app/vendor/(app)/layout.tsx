import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getOrgSettings } from "@/server/settings/service";
import { listVendorNotifications, vendorUnreadCount } from "@/server/notifications/vendor";
import { db } from "@/server/db";
import { primaryLogo } from "@/lib/vendor-assets";
import { fmtDateTime } from "@/lib/date-formats";
import { env } from "@/lib/env";
import { VendorRail } from "@/components/vendor/VendorRail";
import { VendorBell } from "@/components/vendor/VendorBell";
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

  // Rail footer: who's signed in + a way to reach the team (the call-back is core to the funnel).
  const [profile, user, org] = session
    ? await Promise.all([
        getProfile(session.userId),
        db.user.findUnique({ where: { id: session.userId }, select: { phone: true } }),
        getOrgSettings(),
      ])
    : [null, null, await getOrgSettings()];
  const logo = profile ? primaryLogo(profile.assets) : null;
  const supportPhone = org.supportPhone;

  const [bellRows, bellUnread] = profile
    ? await Promise.all([listVendorNotifications(profile.id), vendorUnreadCount(profile.id)])
    : [[], 0];
  const bellItems = bellRows.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    href: n.href,
    createdAt: fmtDateTime(n.createdAt),
    unread: !n.readAt,
  }));

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
        bell={profile ? <VendorBell items={bellItems} unread={bellUnread} /> : undefined}
        footer={
          <div className="flex flex-col gap-[var(--space-sm)]" style={{ color: "rgba(255,255,255,0.92)" }}>
            {supportPhone && (
              <a
                href={`https://wa.me/${supportPhone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="f-paragraph-small rounded-md px-3 py-2 font-bold opacity-80 transition-opacity hover:opacity-100"
                style={{ border: "1px solid rgba(255,255,255,0.25)" }}
              >
                Need help? Message the team
              </a>
            )}
            {profile && (
              <div className="flex min-w-0 items-center gap-[var(--space-sm)] px-3 py-1">
                {logo ? (
                  <Image src={logo} alt="" width={32} height={32} className="size-8 shrink-0 rounded-md object-cover" />
                ) : (
                  <span
                    className="f-paragraph-small grid size-8 shrink-0 place-items-center rounded-md font-bold"
                    style={{ background: "color-mix(in srgb, var(--light-blue) 25%, transparent)" }}
                  >
                    {profile.brandName.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="f-paragraph-small block truncate font-bold">{profile.brandName}</span>
                  {user?.phone && <span className="f-paragraph-small block truncate opacity-60">{user.phone}</span>}
                </span>
              </div>
            )}
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
