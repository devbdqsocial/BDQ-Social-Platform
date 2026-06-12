import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { archiveEvent, unarchiveEvent } from "./archive-service";

const db = new PrismaClient();

const eventId = "test_archive_ev_id";
const ticketTypeId = "test_archive_tt_id";
const stallTypeId = "test_archive_st_id";
const stallId = "test_archive_stall_id";
const orderId = "test_archive_order_id";
const ticketId = "test_archive_ticket_id";
const checkInId = "test_archive_checkin_id";
const bookingId = "test_archive_booking_id";
const paymentIdOrder = "test_archive_pay_order_id";
const paymentIdBooking = "test_archive_pay_booking_id";

async function cleanUp() {
  console.log("Cleaning up potential residual test records...");
  await db.checkIn.deleteMany({ where: { id: checkInId } });
  await db.payment.deleteMany({ where: { id: { in: [paymentIdOrder, paymentIdBooking] } } });
  await db.ticket.deleteMany({ where: { id: ticketId } });
  await db.order.deleteMany({ where: { id: orderId } });
  await db.booking.deleteMany({ where: { id: bookingId } });
  await db.stall.deleteMany({ where: { id: stallId } });
  await db.stallTypeDef.deleteMany({ where: { id: stallTypeId } });
  await db.ticketType.deleteMany({ where: { id: ticketTypeId } });
  await db.mapLayout.deleteMany({ where: { eventId } });
  await db.event.deleteMany({ where: { id: eventId } });
}

async function verifyCounts(expected: number) {
  const checkins = await db.checkIn.count({ where: { id: checkInId } });
  const payments = await db.payment.count({ where: { id: { in: [paymentIdOrder, paymentIdBooking] } } });
  const tickets = await db.ticket.count({ where: { id: ticketId } });
  const orders = await db.order.count({ where: { id: orderId } });
  const bookings = await db.booking.count({ where: { id: bookingId } });
  const stalls = await db.stall.count({ where: { id: stallId } });
  const stallTypes = await db.stallTypeDef.count({ where: { id: stallTypeId } });
  const ticketTypes = await db.ticketType.count({ where: { id: ticketTypeId } });
  const mapLayouts = await db.mapLayout.count({ where: { eventId } });

  console.log(`Counts verification: expected ${expected} for all. Got:`);
  console.log(`- TicketTypes: ${ticketTypes}`);
  console.log(`- StallTypes: ${stallTypes}`);
  console.log(`- Stalls: ${stalls}`);
  console.log(`- MapLayouts: ${mapLayouts}`);
  console.log(`- Bookings: ${bookings}`);
  console.log(`- Orders: ${orders}`);
  console.log(`- Tickets: ${tickets}`);
  console.log(`- Payments: ${payments}`);
  console.log(`- CheckIns: ${checkins}`);

  expect(checkins).toBe(expected);
  expect(payments).toBe(expected * 2);
  expect(tickets).toBe(expected);
  expect(orders).toBe(expected);
  expect(bookings).toBe(expected);
  expect(stalls).toBe(expected);
  expect(stallTypes).toBe(expected);
  expect(ticketTypes).toBe(expected);
  expect(mapLayouts).toBe(expected);
}

describe("Event Archiving Integration", () => {
  it("should logically archive and restore past events", async () => {
    await cleanUp();

    console.log("Seeding mock past event with nested child records...");
    
    // 1. Ensure seed users exist
    const admin = await db.user.upsert({
      where: { id: "admin_seed" },
      update: {},
      create: { id: "admin_seed", role: "SUPER_ADMIN", email: "admin@eventportal.com", name: "System Admin" }
    });
    const customer = await db.user.upsert({
      where: { id: "customer_seed" },
      update: {},
      create: { id: "customer_seed", role: "CUSTOMER", email: "customer@example.com", name: "Demo Customer" }
    });
    const vendor = await db.user.upsert({
      where: { id: "vendor_seed" },
      update: {},
      create: { id: "vendor_seed", role: "VENDOR", name: "Demo Vendor" }
    });
    const vendorProfile = await db.vendorProfile.upsert({
      where: { userId: "vendor_seed" },
      update: {},
      create: { userId: "vendor_seed", brandName: "Indie Threads", category: "Fusion wear", approvalStatus: "APPROVED" }
    });

    // 2. Create Event
    await db.event.create({
      data: {
        id: eventId,
        name: "Test Past Event",
        slug: "test-past-event-archive",
        startsAt: new Date(Date.now() - 3600000 * 2),
        endsAt: new Date(Date.now() - 3600000),
        status: "ENDED",
        createdById: admin.id
      }
    });

    // 3. Create TicketType
    await db.ticketType.create({
      data: {
        id: ticketTypeId,
        eventId,
        name: "VIP Test",
        priceInPaise: 100000,
        totalQty: 10,
      }
    });

    // 4. Create StallTypeDef
    await db.stallTypeDef.create({
      data: {
        id: stallTypeId,
        eventId,
        name: "Standard Stall",
        widthFt: 10,
        heightFt: 10,
        priceInPaise: 500000,
        color: "#ffffff",
        sellable: true
      }
    });

    // 5. Create Stall
    await db.stall.create({
      data: {
        id: stallId,
        eventId,
        stallTypeId,
        kind: "STALL",
        label: "A-1",
        xFt: 10,
        yFt: 10,
        widthFt: 10,
        heightFt: 10,
        rotation: 0,
        priceInPaise: 500000,
        status: "AVAILABLE"
      }
    });

    // 6. Create MapLayout
    await db.mapLayout.create({
      data: {
        eventId,
        layoutJson: { version: 1, canvas: { widthFt: 100, heightFt: 100 }, elements: [] },
        version: 1
      }
    });

    // 7. Create Booking
    await db.booking.create({
      data: {
        id: bookingId,
        eventId,
        stallId,
        vendorProfileId: vendorProfile.id,
        status: "BOOKED",
        source: "VENDOR"
      }
    });

    // 8. Create Order
    await db.order.create({
      data: {
        id: orderId,
        eventId,
        userId: customer.id,
        status: "PAID",
        subtotal: 100000,
        discount: 0,
        total: 100000,
        discountSource: "NONE",
        items: []
      }
    });

    // 9. Create Ticket
    await db.ticket.create({
      data: {
        id: ticketId,
        orderId,
        ticketTypeId,
        holderName: "Test Guest",
        holderPhone: "+919999999999",
        holderEmail: "test@example.com",
        qrToken: "test-token-archive",
        status: "VALID"
      }
    });

    // 10. Create CheckIn
    await db.checkIn.create({
      data: {
        id: checkInId,
        ticketId,
        scannedById: admin.id,
        gate: "Main Gate",
        direction: "IN",
        clientScanId: "client-123",
        scannedAt: new Date()
      }
    });

    // 11. Create Payments (one for order, one for booking)
    await db.payment.create({
      data: {
        id: paymentIdOrder,
        orderId,
        amount: 100000,
        gateway: "OFFLINE",
        mode: "OFFLINE",
        status: "CAPTURED",
        recordedById: admin.id
      }
    });

    await db.payment.create({
      data: {
        id: paymentIdBooking,
        bookingId,
        amount: 500000,
        gateway: "OFFLINE",
        mode: "OFFLINE",
        status: "CAPTURED",
        recordedById: admin.id
      }
    });

    console.log("Mock data seeded successfully.\n");
    await verifyCounts(1);

    // Define super admin mock session
    const adminSession = {
      userId: admin.id,
      role: "SUPER_ADMIN" as const,
      permissions: [],
    };

    console.log("Archiving the event...");
    await archiveEvent(adminSession, eventId);
    
    // Verify status is ARCHIVED
    const eventAfterArchive = await db.event.findUnique({ where: { id: eventId } });
    console.log(`Event status: ${eventAfterArchive?.status}`);
    expect(eventAfterArchive?.status).toBe("ARCHIVED");
    expect(eventAfterArchive?.archiveJson).not.toBeNull();
    console.log("PASS: Event is marked ARCHIVED and contains archiveJson.\n");

    // Verify all child rows are deleted from the tables
    await verifyCounts(0);

    console.log("Unarchiving the event...");
    await unarchiveEvent(adminSession, eventId);

    // Verify status is restored to ENDED
    const eventAfterUnarchive = await db.event.findUnique({ where: { id: eventId } });
    console.log(`Event status: ${eventAfterUnarchive?.status}`);
    expect(eventAfterUnarchive?.status).toBe("ENDED");
    expect(eventAfterUnarchive?.archiveJson).toBeNull();
    console.log("PASS: Event status restored to ENDED and archiveJson is reset to null.\n");

    // Verify all child rows are fully restored with their original IDs
    await verifyCounts(1);

    await cleanUp();
    console.log("ALL LOGICAL ARCHIVE & RESTORE TESTS PASSED SUCCESSFULLY!");
  }, 60000);
});
