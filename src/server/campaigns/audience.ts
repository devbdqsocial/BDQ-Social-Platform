import { db } from "@/server/db";
import { Role } from "@prisma/client";

export type CampaignContact = {
  name: string | null;
  email: string | null;
  phone: string | null;
};

/**
 * Resolves an audience string and targeting rules into a list of contacts.
 * 
 * @param audience - The high-level audience type (e.g., 'ALL', 'VENDORS', 'TICKET_HOLDERS', 'WAITLIST', 'CUSTOM')
 * @param eventId - Optional event scoping
 * @param targeting - Any advanced filtering rules
 * @param customContacts - Overrides or explicitly uploaded CSV contacts
 * @returns Array of contacts { name, email, phone }
 */
export async function resolveAudience(
  audience: string,
  eventId: string | null = null,
  _targeting: unknown = null,
  customContacts: unknown = null
): Promise<CampaignContact[]> {
  const contacts: Map<string, CampaignContact> = new Map();

  const addContact = (contact: CampaignContact) => {
    // Deduplicate by email or phone (prefer email as key, fallback to phone)
    const key = contact.email || contact.phone;
    if (key && !contacts.has(key)) {
      contacts.set(key, contact);
    }
  };

  if (audience === "ALL") {
    // Note: In a real app with 1M users, chunking is required. We assume smaller scale for now.
    // Exclude internal accounts — marketing blasts go to external contacts (customers/vendors) only.
    const users = await db.user.findMany({
      where: { role: { notIn: [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF] } },
      select: { name: true, email: true, phone: true }
    });
    users.forEach(addContact);
  }

  else if (audience === "VENDORS") {
    const whereClause: { role: Role } = { role: Role.VENDOR };
    // If event scoped, maybe only vendors who booked that event
    if (eventId) {
      const vendors = await db.vendorProfile.findMany({
        where: { bookings: { some: { eventId } } },
        include: { user: { select: { name: true, email: true, phone: true } } }
      });
      vendors.forEach(v => addContact(v.user));
    } else {
      const users = await db.user.findMany({
        where: whereClause,
        select: { name: true, email: true, phone: true }
      });
      users.forEach(addContact);
    }
  }

  else if (audience === "TICKET_HOLDERS") {
    if (eventId) {
      const tickets = await db.ticket.findMany({
        where: { order: { eventId, status: "PAID" }, status: "VALID" },
        select: {
          holderName: true,
          holderEmail: true,
          holderPhone: true,
          order: {
            select: {
              user: { select: { name: true, email: true, phone: true } }
            }
          }
        }
      });
      tickets.forEach(t => {
        // Prefer ticket holder details, fallback to order purchaser
        addContact({
          name: t.holderName || t.order.user.name,
          email: t.holderEmail || t.order.user.email,
          phone: t.holderPhone || t.order.user.phone,
        });
      });
    }
  }

  else if (audience === "WAITLIST") {
    const whereClause: { eventId?: string } = {};
    if (eventId) whereClause.eventId = eventId;
    
    const waitlists = await db.waitlist.findMany({
      where: whereClause,
      select: { name: true, email: true, phone: true, user: { select: { name: true, email: true, phone: true } } }
    });

    waitlists.forEach(w => {
      addContact({
        name: w.name || w.user?.name || null,
        email: w.email || w.user?.email || null,
        phone: w.phone || w.user?.phone || null,
      });
    });
  }

  else if (audience === "CUSTOM") {
    // Only use custom contacts
    if (Array.isArray(customContacts)) {
      const contactsList = customContacts as CampaignContact[];
      contactsList.forEach(c => {
        addContact({
          name: c.name || null,
          email: c.email || null,
          phone: c.phone || null,
        });
      });
    }
  }

  // If there are custom contacts appended to other audiences, add them too
  if (audience !== "CUSTOM" && Array.isArray(customContacts)) {
    const contactsList = customContacts as CampaignContact[];
    contactsList.forEach(c => {
      addContact({
        name: c.name || null,
        email: c.email || null,
        phone: c.phone || null,
      });
    });
  }

  return Array.from(contacts.values());
}
