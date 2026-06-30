import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/guard";
import { BdqPageHeader } from "@/components/landing/BdqPageHeader";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { saveProfileAction } from "./actions";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

const field = "f-paragraph w-full bg-transparent pb-[var(--space-sm)] outline-none";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login?next=/profile");
  const user = await db.user.findUnique({ where: { id: session.userId }, select: { phone: true, name: true, email: true } });

  return (
    <section className="paint py-[var(--space-5xl)]">
      <div className="wrapper max-w-[42rem]">
        <BdqPageHeader kicker="Account" title="Profile" lede="Your phone is your sign-in. Add a name and email for receipts and reminders." />

        <dl className="mt-[var(--space-2xl)]">
          <div className="py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
            <dt className="kicker opacity-70">Phone</dt>
            <dd className="f-paragraph mt-[var(--space-xs)]">{user?.phone ?? "—"}</dd>
          </div>
        </dl>

        <form action={saveProfileAction} className="mt-[var(--space-lg)] space-y-[var(--space-xl)]">
          <label className="block">
            <span className="kicker opacity-70">Name</span>
            <input name="name" defaultValue={user?.name ?? ""} maxLength={80} placeholder="Your name" className={field} style={{ borderBottom: "1px solid currentColor" }} />
          </label>
          <label className="block">
            <span className="kicker opacity-70">Email — for receipts</span>
            <input name="email" type="email" defaultValue={user?.email ?? ""} maxLength={120} placeholder="you@email.com" className={field} style={{ borderBottom: "1px solid currentColor" }} />
          </label>
          <button type="submit" className="btn" data-cursor><span className="btn__text">Save</span></button>
        </form>

        <div className="mt-[var(--space-4xl)] pt-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)" }}>
          <SignOutButton className="f-paragraph-small f-bold t-upper link-underline" />
        </div>
      </div>
    </section>
  );
}
