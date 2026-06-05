import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Sample data only. Prices here represent an admin "entering" values — the system never hardcodes
// prices. Idempotent (upsert) so it can be re-run.
async function main() {
  await db.user.upsert({
    where: { id: "admin_seed" },
    update: {},
    create: { id: "admin_seed", role: "SUPER_ADMIN", name: "BDQ Admin", email: "admin@bdqsocial.com" },
  });

  // Demo customer (used by the checkout verification script)
  await db.user.upsert({
    where: { id: "customer_seed" },
    update: {},
    create: { id: "customer_seed", role: "CUSTOMER", name: "Demo Customer", phone: "+910000000002", email: "customer@example.com" },
  });

  // Demo vendor (used by the dev vendor gate)
  await db.user.upsert({
    where: { id: "vendor_seed" },
    update: {},
    create: { id: "vendor_seed", role: "VENDOR", name: "Demo Vendor", phone: "+910000000001" },
  });
  await db.vendorProfile.upsert({
    where: { userId: "vendor_seed" },
    update: {},
    create: {
      userId: "vendor_seed",
      brandName: "Indie Threads",
      category: "Fusion wear",
      description: "Handcrafted fusion wear from across India.",
      approvalStatus: "SUBMITTED",
    },
  });

  // Approved demo brand (for the public brand directory)
  await db.user.upsert({
    where: { id: "vendor_approved" },
    update: {},
    create: { id: "vendor_approved", role: "VENDOR", name: "Indie Threads Co.", phone: "+910000000003" },
  });
  const approved = await db.vendorProfile.upsert({
    where: { userId: "vendor_approved" },
    update: { approvalStatus: "APPROVED" },
    create: {
      userId: "vendor_approved",
      brandName: "Indie Threads Co.",
      category: "Fusion wear",
      description: "Handcrafted fusion wear and artisanal accessories from across India.",
      website: "https://example.com",
      socials: { instagram: "@indiethreads" },
      approvalStatus: "APPROVED",
    },
  });
  const existingLogo = await db.vendorAsset.findFirst({ where: { vendorProfileId: approved.id, kind: "LOGO" } });
  if (!existingLogo) {
    await db.vendorAsset.create({
      data: { vendorProfileId: approved.id, kind: "LOGO", url: "https://res.cloudinary.com/demo/image/upload/sample.jpg", publicId: "demo/sample" },
    });
  }

  const event = await db.event.upsert({
    where: { slug: "lifestyle-festival-october" },
    update: {},
    create: {
      name: "Lifestyle Festival — October Edition",
      slug: "lifestyle-festival-october",
      description:
        "Vadodara's premium curated lifestyle festival & night market. 80+ indie brands, gourmet food, live indie music, and curated spaces.",
      location: "Main Exhibition Grounds, Vadodara",
      startsAt: new Date("2026-10-17T16:00:00+05:30"),
      endsAt: new Date("2026-10-17T23:00:00+05:30"),
      status: "PUBLISHED",
      capacity: 3000,
      createdById: "admin_seed",
      ticketTypes: {
        create: [
          { name: "General", priceInPaise: 49900, totalQty: 2000 },
          { name: "Couple", priceInPaise: 89900, totalQty: 500, attendeesPer: 2 },
          { name: "VIP", priceInPaise: 149900, totalQty: 200 },
        ],
      },
      schedule: {
        create: [
          { startsAt: new Date("2026-10-17T16:30:00+05:30"), title: "Gates open · sundowner acoustic", stageOrZone: "Main Stage", sortOrder: 1 },
          { startsAt: new Date("2026-10-17T19:00:00+05:30"), title: "Indie headline set", stageOrZone: "Main Stage", sortOrder: 2 },
          { startsAt: new Date("2026-10-17T21:00:00+05:30"), title: "High-energy night", stageOrZone: "Main Stage", sortOrder: 3 },
        ],
      },
    },
  });

  // Demo floor plan: a 4x3 grid of small stalls + a stage, with varied statuses (a real admin
  // designs the full map in the designer). Idempotent.
  const stalls = [];
  let n = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      n++;
      stalls.push({
        eventId: event.id,
        kind: "STALL",
        label: `S-${n}`,
        xFt: 40 + c * 16,
        yFt: 50 + r * 16,
        widthFt: 10,
        heightFt: 10,
        rotation: 0,
        priceInPaise: 1500000,
        status: "AVAILABLE",
      });
    }
  }
  stalls[1].status = "BOOKED";
  stalls[3].status = "HELD";
  stalls[6].status = "PENDING";
  stalls.push({
    eventId: event.id,
    kind: "INFRA",
    label: "Main Stage",
    xFt: 120,
    yFt: 40,
    widthFt: 40,
    heightFt: 24,
    rotation: 0,
    priceInPaise: null,
    status: "AVAILABLE",
  });

  const layoutJson = {
    version: 1,
    canvas: { widthFt: 230, heightFt: 160 },
    elements: stalls.map((s) => ({
      id: s.label,
      kind: s.kind === "INFRA" ? "infra" : "stall",
      type: s.kind === "INFRA" ? "STAGE" : "SMALL",
      label: s.label,
      xFt: s.xFt,
      yFt: s.yFt,
      widthFt: s.widthFt,
      heightFt: s.heightFt,
      rotation: 0,
      ...(s.priceInPaise != null ? { priceInPaise: s.priceInPaise } : {}),
    })),
  };

  await db.mapLayout.upsert({
    where: { eventId: event.id },
    update: { layoutJson },
    create: { eventId: event.id, layoutJson },
  });
  await db.stall.deleteMany({ where: { eventId: event.id } });
  await db.stall.createMany({ data: stalls });

  // A 2nd concurrent event — proves multi-event isolation (separate tickets/stalls/analytics).
  const event2 = await db.event.upsert({
    where: { slug: "lifestyle-festival-december" },
    update: {},
    create: {
      name: "Lifestyle Festival — December Edition",
      slug: "lifestyle-festival-december",
      description: "The winter night market — cosy lights and a fresh lineup of makers.",
      location: "Main Exhibition Grounds, Vadodara",
      startsAt: new Date("2026-12-19T16:00:00+05:30"),
      endsAt: new Date("2026-12-19T23:00:00+05:30"),
      status: "PUBLISHED",
      capacity: 2500,
      createdById: "admin_seed",
      ticketTypes: {
        create: [
          { name: "General", priceInPaise: 59900, totalQty: 1500 },
          { name: "VIP", priceInPaise: 169900, totalQty: 150 },
        ],
      },
    },
  });

  const stalls2 = [];
  for (let i = 1; i <= 6; i++) {
    stalls2.push({
      eventId: event2.id,
      kind: "STALL",
      label: `D-${i}`,
      xFt: 40 + ((i - 1) % 3) * 16,
      yFt: 50 + Math.floor((i - 1) / 3) * 16,
      widthFt: 10,
      heightFt: 10,
      rotation: 0,
      priceInPaise: 1200000,
      status: "AVAILABLE",
    });
  }
  await db.mapLayout.upsert({
    where: { eventId: event2.id },
    update: {},
    create: {
      eventId: event2.id,
      layoutJson: {
        version: 1,
        canvas: { widthFt: 120, heightFt: 100 },
        elements: stalls2.map((s) => ({ id: s.label, kind: "stall", type: "SMALL", label: s.label, xFt: s.xFt, yFt: s.yFt, widthFt: s.widthFt, heightFt: s.heightFt, rotation: 0, priceInPaise: s.priceInPaise })),
      },
    },
  });
  await db.stall.deleteMany({ where: { eventId: event2.id } });
  await db.stall.createMany({ data: stalls2 });

  console.log(`Seeded admin + 2 events ("${event.slug}", "${event2.slug}") + ${stalls.length + stalls2.length} stalls`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
