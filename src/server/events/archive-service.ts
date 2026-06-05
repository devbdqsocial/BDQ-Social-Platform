/* eslint-disable @typescript-eslint/no-explicit-any -- archive/restore deserialises a dynamic
   event JSON snapshot (Event.archiveJson); `any` is intentional for the snapshot shapes. */
import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { Prisma } from "@prisma/client";

/**
 * Logical archiving of an event. Fetches all relations, serializes them to JSON,
 * deletes child records to save storage space and database load, and sets event status to ARCHIVED.
 */
export async function archiveEvent(session: Session, eventId: string) {
  return withAudit(session, { action: "ARCHIVE", entity: "Event", entityId: eventId }, async () => {
    // 1. Fetch event and all its relations
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        ticketTypes: true,
        schedule: true,
        stallTypes: true,
        stalls: true,
        mapLayout: true,
        orders: {
          include: {
            tickets: {
              include: {
                checkIns: true,
              }
            },
            payments: true,
          }
        },
        coupons: true,
        bookings: {
          include: {
            payment: true,
          }
        },
        sponsors: true,
        waitlist: true,
        leads: true,
      }
    });

    if (!event) throw new Error("Event not found");
    if (event.status === "ARCHIVED") throw new Error("Event is already archived");

    // 2. Prepare the payload to be archived
    const archiveData = {
      ticketTypes: event.ticketTypes,
      schedule: event.schedule,
      stallTypes: event.stallTypes,
      stalls: event.stalls,
      mapLayout: event.mapLayout,
      orders: event.orders.map(o => {
        const { tickets, payments, ...rest } = o;
        return {
          ...rest,
          tickets: tickets.map(t => {
            const { checkIns, ...tRest } = t;
            return { ...tRest, checkIns };
          }),
          payments,
        };
      }),
      coupons: event.coupons,
      bookings: event.bookings,
      sponsors: event.sponsors,
      waitlist: event.waitlist,
      leads: event.leads,
    };

    return {
      before: { status: event.status },
      run: async () => {
        // Run everything inside a transaction to prevent partial deletion
        await db.$transaction(async (tx) => {
          const orderIds = event.orders.map(o => o.id);
          const ticketIds = event.orders.flatMap(o => o.tickets.map(t => t.id));

          // A. Delete child records in reverse dependency order
          if (ticketIds.length > 0) {
            await tx.checkIn.deleteMany({ where: { ticketId: { in: ticketIds } } });
          }
          
          await tx.payment.deleteMany({
            where: {
              OR: [
                { orderId: { in: orderIds } },
                { bookingId: { in: event.bookings.map(b => b.id) } }
              ]
            }
          });

          if (orderIds.length > 0) {
            await tx.ticket.deleteMany({ where: { orderId: { in: orderIds } } });
            await tx.order.deleteMany({ where: { eventId } });
          }

          await tx.booking.deleteMany({ where: { eventId } });
          await tx.stall.deleteMany({ where: { eventId } });
          await tx.stallTypeDef.deleteMany({ where: { eventId } });
          await tx.scheduleItem.deleteMany({ where: { eventId } });
          await tx.ticketType.deleteMany({ where: { eventId } });
          await tx.mapLayout.deleteMany({ where: { eventId } });
          await tx.sponsor.deleteMany({ where: { eventId } });
          await tx.waitlist.deleteMany({ where: { eventId } });
          await tx.lead.deleteMany({ where: { eventId } });
          await tx.coupon.deleteMany({ where: { eventId } });

          // B. Update the event status and archiveJson
          await tx.event.update({
            where: { id: eventId },
            data: {
              status: "ARCHIVED",
              archiveJson: archiveData as unknown as Prisma.InputJsonValue,
            }
          });
        });

        return { result: { success: true }, after: { status: "ARCHIVED" } };
      }
    };
  });
}

/**
 * Restores an archived event. Recreates all child records from the archiveJson column
 * and sets the event status back to ENDED.
 */
export async function unarchiveEvent(session: Session, eventId: string) {
  return withAudit(session, { action: "UNARCHIVE", entity: "Event", entityId: eventId }, async () => {
    const event = await db.event.findUnique({
      where: { id: eventId }
    });

    if (!event) throw new Error("Event not found");
    if (event.status !== "ARCHIVED" || !event.archiveJson) {
      throw new Error("Event is not archived or has no archived data");
    }

    const data = event.archiveJson as any;

    return {
      before: { status: event.status },
      run: async () => {
        await db.$transaction(async (tx) => {
          // Restore mapLayout
          if (data.mapLayout) {
            await tx.mapLayout.create({
              data: {
                id: data.mapLayout.id,
                eventId: data.mapLayout.eventId,
                layoutJson: data.mapLayout.layoutJson,
                opsLayerJson: data.mapLayout.opsLayerJson,
                version: data.mapLayout.version,
                updatedAt: new Date(data.mapLayout.updatedAt)
              }
            });
          }

          // Restore ticketTypes
          if (data.ticketTypes && data.ticketTypes.length > 0) {
            await tx.ticketType.createMany({
              data: data.ticketTypes.map((t: any) => ({
                id: t.id,
                eventId: t.eventId,
                name: t.name,
                priceInPaise: t.priceInPaise,
                earlyPricePaise: t.earlyPricePaise,
                totalQty: t.totalQty,
                soldQty: t.soldQty,
                attendeesPer: t.attendeesPer
              }))
            });
          }

          // Restore schedule
          if (data.schedule && data.schedule.length > 0) {
            await tx.scheduleItem.createMany({
              data: data.schedule.map((s: any) => ({
                id: s.id,
                eventId: s.eventId,
                startsAt: new Date(s.startsAt),
                endsAt: s.endsAt ? new Date(s.endsAt) : null,
                title: s.title,
                stageOrZone: s.stageOrZone,
                performer: s.performer,
                sortOrder: s.sortOrder
              }))
            });
          }

          // Restore stallTypes
          if (data.stallTypes && data.stallTypes.length > 0) {
            await tx.stallTypeDef.createMany({
              data: data.stallTypes.map((st: any) => ({
                id: st.id,
                eventId: st.eventId,
                name: st.name,
                widthFt: st.widthFt,
                heightFt: st.heightFt,
                priceInPaise: st.priceInPaise,
                color: st.color,
                sellable: st.sellable
              }))
            });
          }

          // Restore stalls
          if (data.stalls && data.stalls.length > 0) {
            await tx.stall.createMany({
              data: data.stalls.map((s: any) => ({
                id: s.id,
                eventId: s.eventId,
                kind: s.kind,
                stallTypeId: s.stallTypeId,
                label: s.label,
                xFt: s.xFt,
                yFt: s.yFt,
                widthFt: s.widthFt,
                heightFt: s.heightFt,
                rotation: s.rotation,
                priceInPaise: s.priceInPaise,
                status: s.status,
                holdUntil: s.holdUntil ? new Date(s.holdUntil) : null
              }))
            });
          }

          // Restore coupons
          if (data.coupons && data.coupons.length > 0) {
            await tx.coupon.createMany({
              data: data.coupons.map((c: any) => ({
                id: c.id,
                eventId: c.eventId,
                code: c.code,
                type: c.type,
                value: c.value,
                maxUses: c.maxUses,
                usedCount: c.usedCount,
                perUserLimit: c.perUserLimit,
                minOrder: c.minOrder,
                scope: c.scope,
                startsAt: c.startsAt ? new Date(c.startsAt) : null,
                endsAt: c.endsAt ? new Date(c.endsAt) : null,
                active: c.active
              }))
            });
          }

          // Restore sponsors
          if (data.sponsors && data.sponsors.length > 0) {
            await tx.sponsor.createMany({
              data: data.sponsors.map((s: any) => ({
                id: s.id,
                eventId: s.eventId,
                name: s.name,
                tier: s.tier,
                logoUrl: s.logoUrl,
                placements: s.placements,
                leadAccess: s.leadAccess
              }))
            });
          }

          // Restore waitlists
          if (data.waitlist && data.waitlist.length > 0) {
            await tx.waitlist.createMany({
              data: data.waitlist.map((w: any) => ({
                id: w.id,
                eventId: w.eventId,
                type: w.type,
                userId: w.userId,
                contact: w.contact,
                meta: w.meta,
                notifiedAt: w.notifiedAt ? new Date(w.notifiedAt) : null,
                createdAt: new Date(w.createdAt)
              }))
            });
          }

          // Restore leads
          if (data.leads && data.leads.length > 0) {
            await tx.lead.createMany({
              data: data.leads.map((l: any) => ({
                id: l.id,
                eventId: l.eventId,
                vendorProfileId: l.vendorProfileId,
                name: l.name,
                phone: l.phone,
                email: l.email,
                consent: l.consent,
                createdAt: new Date(l.createdAt)
              }))
            });
          }

          // Restore bookings (and their payments)
          if (data.bookings && data.bookings.length > 0) {
            for (const b of data.bookings) {
              await tx.booking.create({
                data: {
                  id: b.id,
                  eventId: b.eventId,
                  stallId: b.stallId,
                  vendorProfileId: b.vendorProfileId,
                  source: b.source,
                  adminDetails: b.adminDetails,
                  status: b.status,
                  gatewayOrderId: b.gatewayOrderId,
                  createdAt: new Date(b.createdAt),
                  updatedAt: new Date(b.updatedAt)
                }
              });
              if (b.payment) {
                await tx.payment.create({
                  data: {
                    id: b.payment.id,
                    bookingId: b.payment.bookingId,
                    orderId: b.payment.orderId,
                    gateway: b.payment.gateway,
                    mode: b.payment.mode,
                    gatewayRef: b.payment.gatewayRef,
                    amount: b.payment.amount,
                    status: b.payment.status,
                    recordedById: b.payment.recordedById,
                    meta: b.payment.meta,
                    createdAt: new Date(b.payment.createdAt)
                  }
                });
              }
            }
          }

          // Restore orders, tickets, and checkIns
          if (data.orders && data.orders.length > 0) {
            for (const o of data.orders) {
              await tx.order.create({
                data: {
                  id: o.id,
                  userId: o.userId,
                  eventId: o.eventId,
                  status: o.status,
                  subtotal: o.subtotal,
                  discount: o.discount,
                  total: o.total,
                  discountSource: o.discountSource,
                  couponId: o.couponId,
                  gatewayOrderId: o.gatewayOrderId,
                  items: o.items,
                  utm: o.utm,
                  expiresAt: o.expiresAt ? new Date(o.expiresAt) : null,
                  createdAt: new Date(o.createdAt)
                }
              });

              if (o.payments && o.payments.length > 0) {
                await tx.payment.createMany({
                  data: o.payments.map((p: any) => ({
                    id: p.id,
                    orderId: p.orderId,
                    bookingId: p.bookingId,
                    gateway: p.gateway,
                    mode: p.mode,
                    gatewayRef: p.gatewayRef,
                    amount: p.amount,
                    status: p.status,
                    recordedById: p.recordedById,
                    meta: p.meta,
                    createdAt: new Date(p.createdAt)
                  }))
                });
              }

              if (o.tickets && o.tickets.length > 0) {
                for (const t of o.tickets) {
                  await tx.ticket.create({
                    data: {
                      id: t.id,
                      orderId: t.orderId,
                      ticketTypeId: t.ticketTypeId,
                      holderName: t.holderName,
                      holderPhone: t.holderPhone,
                      holderEmail: t.holderEmail,
                      qrToken: t.qrToken,
                      status: t.status,
                      isComp: t.isComp,
                      createdAt: new Date(t.createdAt)
                    }
                  });

                  if (t.checkIns && t.checkIns.length > 0) {
                    await tx.checkIn.createMany({
                      data: t.checkIns.map((ci: any) => ({
                        id: ci.id,
                        ticketId: ci.ticketId,
                        scannedById: ci.scannedById,
                        gate: ci.gate,
                        direction: ci.direction,
                        clientScanId: ci.clientScanId,
                        scannedAt: new Date(ci.scannedAt)
                      }))
                    });
                  }
                }
              }
            }
          }

          // Update Event: set status to ENDED and clear the archive snapshot (SQL NULL)
          await tx.event.update({
            where: { id: eventId },
            data: {
              status: "ENDED",
              archiveJson: Prisma.DbNull
            }
          });
        });

        return { result: { success: true }, after: { status: "ENDED" } };
      }
    };
  });
}
