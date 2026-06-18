import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { joinWaitlist, listWaitlist } from "./service";
import { joinPlatformWaitlist } from "@/actions/waitlist";

const db = new PrismaClient();

const testEventId = "test_waitlist_ev_id";
const testPhone = "9999999999";
const testPhoneE164 = "+919999999999"; // how the action now stores it

async function cleanUp() {
  await db.waitlist.deleteMany({
    where: {
      OR: [
        { eventId: testEventId },
        { phone: { in: [testPhone, testPhoneE164] } },
        { contact: { in: [testPhone, testPhoneE164] } },
      ],
    },
  });
  await db.event.deleteMany({ where: { id: testEventId } });
}

// DB integration — skipped unless RUN_DB_TESTS=1 (its cleanup hooks hit a real DB; CI has none).
describe.runIf(process.env.RUN_DB_TESTS === "1")("Unified Waitlist Integration", () => {
  beforeAll(async () => {
    await cleanUp();
    // Seed a test event
    await db.event.create({
      data: {
        id: testEventId,
        name: "Test Event for Waitlist",
        slug: "test-event-waitlist",
        startsAt: new Date(),
        endsAt: new Date(),
        status: "PUBLISHED",
      },
    });
  });

  afterAll(async () => {
    await cleanUp();
    await db.$disconnect();
  });

  it("should successfully join event waitlist with source EVENT", async () => {
    const entry = await joinWaitlist({
      eventId: testEventId,
      type: "TICKET",
      contact: "test-waitlister@example.com",
    });

    expect(entry).toBeDefined();
    expect(entry.eventId).toBe(testEventId);
    expect(entry.source).toBe("EVENT");
    expect(entry.type).toBe("TICKET");
    expect(entry.contact).toBe("test-waitlister@example.com");

    const list = await listWaitlist(testEventId);
    expect(list.some(e => e.id === entry.id)).toBe(true);
  });

  it("should successfully join platform waitlist with source PLATFORM", async () => {
    const formData = new FormData();
    formData.set("phone", testPhone);
    formData.set("interestedInStall", "true");

    const result = await joinPlatformWaitlist(formData);
    expect(result.success).toBe(true);

    const entry = await db.waitlist.findFirst({
      where: {
        source: "PLATFORM",
        phone: testPhoneE164,
      },
    });

    expect(entry).toBeDefined();
    expect(entry?.type).toBe("STALL");
    expect(entry?.phone).toBe(testPhoneE164);
    expect(entry?.contact).toBe(testPhoneE164);
  });
});

// Validation path returns before any DB call, so this runs without RUN_DB_TESTS.
describe("joinPlatformWaitlist phone validation", () => {
  it("rejects more than 10 digits", async () => {
    const fd = new FormData();
    fd.set("phone", "98765432109");
    expect("error" in (await joinPlatformWaitlist(fd))).toBe(true);
  });
  it("rejects fewer than 10 digits / non-numeric", async () => {
    const fd = new FormData();
    fd.set("phone", "12345");
    expect("error" in (await joinPlatformWaitlist(fd))).toBe(true);
  });
});
