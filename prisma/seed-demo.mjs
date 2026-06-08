import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

/**
 * DEMO seed — wipes the transactional/demo data and regenerates a rich, internally-consistent
 * dataset across every model so the whole admin panel feels live. LOCAL/DEV DB ONLY.
 *
 * Run: npm run db:seed:demo   (override the guard with ALLOW_DEMO_SEED=1 only if you know why)
 * Money is integer paise. faker is seeded so re-runs are reproducible.
 */

// ─────────────────────────── prod guard ───────────────────────────
const DB_URL = process.env.DATABASE_URL ?? "";
const HOST = (DB_URL.match(/@([^/:?]+)/)?.[1] ?? "").toLowerCase();
const LOOKS_PROD = HOST.includes("ep-dry-sunset");
const LOOKS_LOCAL = HOST.includes("ep-restless-dawn");
if (!process.env.ALLOW_DEMO_SEED && (LOOKS_PROD || !LOOKS_LOCAL)) {
  console.error(
    `\n✖ Refusing to run the demo seed.\n  DATABASE_URL host "${HOST || "(unset)"}" is not the known local dev DB (ep-restless-dawn).\n  This script WIPES data. If you really mean to target this DB, set ALLOW_DEMO_SEED=1.\n`,
  );
  process.exit(1);
}

faker.seed(1337);
const db = new PrismaClient();

// ─────────────────────────── helpers ───────────────────────────
const ADMIN_ID = "admin_seed";
const pick = (arr) => faker.helpers.arrayElement(arr);
const some = (arr, n) => faker.helpers.arrayElements(arr, n);
const int = (min, max) => faker.number.int({ min, max });
const chance = (p) => faker.number.float({ min: 0, max: 1 }) < p;
const daysAgo = (n) => new Date(Date.now() - n * 86400000);
const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
const rupees = (r) => Math.round(r * 100); // → paise
const IMG = (id) => `https://res.cloudinary.com/demo/image/upload/${id}.jpg`;
const DEMO_IMAGES = ["sample", "cld-sample", "cld-sample-2", "cld-sample-3", "cld-sample-4", "cld-sample-5"];
const GATES = ["Main Gate", "VIP Gate", "East Gate"];
const UTM_SOURCES = ["organic", "instagram", "facebook", "email", "google", "direct"];

let phoneSeq = 0;
const nextPhone = () => "+9198" + String(76000000 + phoneSeq++).padStart(8, "0");
let emailSeq = 0;
const nextEmail = (name) =>
  `${faker.helpers.slugify(name).toLowerCase().replace(/[^a-z0-9]/g, "")}.${emailSeq++}@example.com`;
let qrSeq = 0;
const nextQr = () => `demoqr_${qrSeq++}_${faker.string.alphanumeric(12)}`;

// ─────────────────────────── wipe (FK-safe child→parent) ───────────────────────────
async function wipe() {
  const steps = [
    () => db.checkIn.deleteMany({}),
    () => db.ticket.deleteMany({}),
    () => db.couponRedemption.deleteMany({}),
    () => db.payment.deleteMany({}),
    () => db.booking.deleteMany({}),
    () => db.order.deleteMany({}),
    () => db.lead.deleteMany({}),
    () => db.expense.deleteMany({}),
    () => db.expenseSchedule.deleteMany({}),
    () => db.budget.deleteMany({}),
    () => db.settlement.deleteMany({}),
    () => db.sponsor.deleteMany({}),
    () => db.waitlist.deleteMany({}),
    () => db.notification.deleteMany({}),
    () => db.campaign.deleteMany({}),
    () => db.outbox.deleteMany({}),
    () => db.auditLog.deleteMany({}),
    () => db.coupon.deleteMany({}),
    () => db.stall.deleteMany({}),
    () => db.scheduleItem.deleteMany({}),
    () => db.mapLayout.deleteMany({}),
    () => db.ticketType.deleteMany({}),
    () => db.vendorContract.deleteMany({}),
    () => db.vendorKyc.deleteMany({}),
    () => db.vendorAsset.deleteMany({}),
    () => db.vendorProfile.deleteMany({}),
    () => db.event.deleteMany({}),
    () => db.eventMap.deleteMany({}),
    () => db.mapElement.deleteMany({}),
    () => db.layoutTemplate.deleteMany({}),
    () => db.user.deleteMany({ where: { id: { not: ADMIN_ID } } }),
  ];
  for (const step of steps) await step();
}

// ─────────────────────────── main ───────────────────────────
async function main() {
  await wipe();

  // Keep the admin login account (DEV_ADMIN returns admin_seed in dev).
  await db.user.upsert({
    where: { id: ADMIN_ID },
    update: {},
    create: { id: ADMIN_ID, role: "SUPER_ADMIN", name: "BDQ Admin", email: "admin@bdqsocial.com", totpEnabled: true },
  });

  // ── staff & admins ──
  const staff = [];
  for (const [role, perms] of [
    ["ADMIN", ["PAYMENT_VIEW", "FINANCE_MANAGE", "TICKETS_MANAGE", "VENDOR_MANAGE"]],
    ["ADMIN", ["PAYMENT_VIEW", "TICKETS_MANAGE"]],
    ["STAFF", ["CHECKIN", "VENDOR_VIEW"]],
    ["STAFF", ["CHECKIN", "PAYMENT_VIEW"]],
  ]) {
    const name = faker.person.fullName();
    staff.push(
      await db.user.create({
        data: { role, name, email: nextEmail(name), phone: nextPhone(), permissions: perms },
      }),
    );
  }
  const scanners = [staff[2], staff[3], { id: ADMIN_ID }];

  // ── customers (a few with repeat-buy behaviour) ──
  const customers = [];
  for (let i = 0; i < 14; i++) {
    const name = faker.person.fullName();
    customers.push(
      await db.user.create({
        data: {
          role: "CUSTOMER",
          name,
          email: nextEmail(name),
          phone: nextPhone(),
          createdAt: faker.date.past({ years: 1 }),
        },
      }),
    );
  }

  // ── vendors (+ profile, kyc, assets, contract) ──
  const vendors = [];
  const VENDOR_CATEGORIES = ["Fusion wear", "Street food", "Handmade jewellery", "Home decor", "Artisan coffee", "Skincare", "Plants & pots", "Vinyl & books"];
  const APPROVALS = ["APPROVED", "APPROVED", "APPROVED", "APPROVED", "UNDER_REVIEW", "SUBMITTED", "REJECTED", "APPROVED"];
  for (let i = 0; i < 8; i++) {
    const brand = faker.company.name();
    const uname = faker.person.fullName();
    const user = await db.user.create({ data: { role: "VENDOR", name: uname, phone: nextPhone() } });
    const approval = APPROVALS[i];
    const profile = await db.vendorProfile.create({
      data: {
        userId: user.id,
        brandName: brand,
        category: VENDOR_CATEGORIES[i % VENDOR_CATEGORIES.length],
        description: faker.company.catchPhrase(),
        website: faker.internet.url(),
        socials: { instagram: "@" + faker.internet.username().toLowerCase(), facebook: faker.internet.url() },
        approvalStatus: approval,
        verifiedCallById: approval === "APPROVED" ? ADMIN_ID : null,
        verifiedAt: approval === "APPROVED" ? faker.date.recent({ days: 30 }) : null,
        createdAt: faker.date.recent({ days: 60 }),
      },
    });
    // KYC for most
    if (chance(0.8)) {
      await db.vendorKyc.create({
        data: {
          vendorProfileId: profile.id,
          pan: faker.string.alpha({ length: 5, casing: "upper" }) + faker.string.numeric(4) + faker.string.alpha({ length: 1, casing: "upper" }),
          fssai: i % 2 === 0 ? faker.string.numeric(14) : null,
          gstin: chance(0.5) ? faker.string.alphanumeric(15).toUpperCase() : null,
          docUrls: { pan: IMG(pick(DEMO_IMAGES)), fssai: IMG(pick(DEMO_IMAGES)) },
        },
      });
    }
    // assets
    await db.vendorAsset.create({ data: { vendorProfileId: profile.id, kind: "LOGO", url: IMG(pick(DEMO_IMAGES)), publicId: `seed/logo_${i}` } });
    if (chance(0.7)) await db.vendorAsset.create({ data: { vendorProfileId: profile.id, kind: "BANNER", url: IMG(pick(DEMO_IMAGES)), publicId: `seed/banner_${i}` } });
    for (let p = 0; p < int(1, 3); p++) await db.vendorAsset.create({ data: { vendorProfileId: profile.id, kind: "PRODUCT", url: IMG(pick(DEMO_IMAGES)), publicId: `seed/prod_${i}_${p}` } });
    // contract
    if (approval === "APPROVED") {
      const signed = chance(0.6);
      await db.vendorContract.create({
        data: { vendorProfileId: profile.id, status: signed ? "SIGNED" : "SENT", url: IMG(pick(DEMO_IMAGES)), signedAt: signed ? faker.date.recent({ days: 20 }) : null },
      });
    }
    vendors.push(profile);
  }
  const approvedVendors = vendors.filter((v) => v.approvalStatus === "APPROVED");

  // ── events ──
  const eventSpecs = [
    { name: "BDQ Lifestyle Festival — Spring Edition", slug: "bdq-spring", status: "ENDED", start: daysAgo(35), end: daysAgo(34), capacity: 2500 },
    { name: "BDQ Night Market — Live Now", slug: "bdq-live", status: "LIVE", start: daysAgo(1), end: daysFromNow(2), capacity: 3000 },
    { name: "BDQ Winter Carnival — Upcoming", slug: "bdq-winter", status: "PUBLISHED", start: daysFromNow(40), end: daysFromNow(41), capacity: 2000 },
  ];
  const TYPE_DEFS = [
    { name: "Small", widthFt: 10, heightFt: 10, color: "#C2603B" },
    { name: "Lane", widthFt: 10, heightFt: 10, color: "#3B6E4F" },
    { name: "Premium", widthFt: 15, heightFt: 12, color: "#C9A227" },
  ];
  const events = [];
  for (const spec of eventSpecs) {
    const event = await db.event.create({
      data: {
        name: spec.name,
        slug: spec.slug,
        description: faker.lorem.paragraph(),
        location: `${faker.location.streetAddress()}, Vadodara`,
        mapLink: faker.internet.url(),
        startsAt: spec.start,
        endsAt: spec.end,
        status: spec.status,
        capacity: spec.capacity,
        createdById: ADMIN_ID,
        theme: { primary: "#C2603B", accent: "#C9A227" },
        bulkTiers: [{ minQty: 6, percent: 10 }, { minQty: 10, percent: 15 }],
        earlyBird: { endsAt: spec.start, percent: 15 },
      },
    });

    // ticket types (last one is a sold-out target; one Couple type)
    const ttSpecs = [
      { name: "Early Bird", priceInPaise: rupees(399), earlyPricePaise: rupees(349), totalQty: 300, attendeesPer: 1 },
      { name: "General", priceInPaise: rupees(599), totalQty: 1500, attendeesPer: 1 },
      { name: "Couple", priceInPaise: rupees(999), totalQty: 400, attendeesPer: 2 },
      { name: "VIP", priceInPaise: rupees(1799), earlyPricePaise: rupees(1599), totalQty: 120, attendeesPer: 1 },
    ];
    const ticketTypes = [];
    for (const t of ttSpecs) ticketTypes.push(await db.ticketType.create({ data: { eventId: event.id, ...t } }));

    // schedule
    for (let s = 0; s < 5; s++) {
      const at = new Date(spec.start.getTime() + s * 90 * 60000);
      await db.scheduleItem.create({
        data: { eventId: event.id, startsAt: at, endsAt: new Date(at.getTime() + 60 * 60000), title: faker.music.songName(), stageOrZone: pick(["Main Stage", "Acoustic Lawn", "DJ Deck"]), performer: faker.person.fullName(), sortOrder: s + 1 },
      });
    }

    // stall types + stalls
    const types = [];
    for (const td of TYPE_DEFS) types.push(await db.stallTypeDef.create({ data: { eventId: event.id, ...td, priceInPaise: rupees(td.name === "Premium" ? 25000 : 15000), sellable: true } }));
    const stalls = [];
    let sn = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        sn++;
        const type = types[(r + c) % types.length];
        stalls.push(
          await db.stall.create({
            data: { eventId: event.id, kind: "STALL", stallTypeId: type.id, label: `${spec.slug[4].toUpperCase()}-${sn}`, xFt: 40 + c * 16, yFt: 50 + r * 16, widthFt: type.widthFt, heightFt: type.heightFt, rotation: 0, priceInPaise: type.priceInPaise, status: "AVAILABLE" },
          }),
        );
      }
    }
    // one infra (stage)
    stalls.push(await db.stall.create({ data: { eventId: event.id, kind: "INFRA", label: "Main Stage", xFt: 120, yFt: 30, widthFt: 40, heightFt: 24, rotation: 0, status: "AVAILABLE" } }));

    // map layout
    await db.mapLayout.create({
      data: {
        eventId: event.id,
        layoutJson: {
          version: 1,
          canvas: { widthFt: 230, heightFt: 160 },
          elements: stalls.map((s) => ({ id: s.label, kind: s.kind === "INFRA" ? "infra" : "stall", type: s.kind === "INFRA" ? "STAGE" : "SMALL", label: s.label, xFt: s.xFt, yFt: s.yFt, widthFt: s.widthFt, heightFt: s.heightFt, rotation: 0 })),
        },
        opsLayerJson: { power: [], water: [], emergency: [] },
      },
    });

    events.push({ event, spec, ticketTypes, stalls: stalls.filter((s) => s.kind === "STALL") });
  }

  // ── global map catalog ──
  await db.layoutTemplate.create({ data: { name: "Main Exhibition Grounds", createdById: ADMIN_ID, layoutJson: { version: 1, canvas: { widthFt: 230, heightFt: 160 }, elements: [] } } });
  await db.eventMap.create({ data: { name: "Aarush Lawn", description: "Reusable 230×160 venue", locationName: "Vadodara", widthFt: 230, heightFt: 160, gridFt: 5, createdById: ADMIN_ID, layoutJson: { version: 1, elements: [] } } });
  for (const me of [
    { name: "Small Stall", kind: "STALL", widthFt: 10, heightFt: 10, color: "#C2603B" },
    { name: "Premium Stall", kind: "STALL", widthFt: 15, heightFt: 12, color: "#C9A227" },
    { name: "Food Stall", kind: "STALL", widthFt: 10, heightFt: 12, color: "#3B6E4F" },
    { name: "Stage", kind: "INFRA", widthFt: 40, heightFt: 24, color: "#6b7280", sellable: false },
  ]) await db.mapElement.create({ data: me });

  // ── coupons ──
  const couponSpecs = [
    { code: "EARLYBIRD20", type: "PERCENT", value: 20, maxUses: 100, eventId: events[1].event.id },
    { code: "FLAT200", type: "FLAT", value: rupees(200), maxUses: 50, eventId: null },
    { code: "WELCOME10", type: "PERCENT", value: 10, maxUses: null, eventId: null },
    { code: "BULK15", type: "PERCENT", value: 15, maxUses: 30, eventId: events[0].event.id },
    { code: "VIPPASS", type: "FLAT", value: rupees(500), maxUses: 20, eventId: events[1].event.id },
  ];
  const coupons = [];
  for (const c of couponSpecs) {
    coupons.push(
      await db.coupon.create({
        data: { ...c, perUserLimit: 1, minOrder: c.type === "FLAT" ? rupees(1000) : null, scope: {}, startsAt: daysAgo(40), endsAt: daysFromNow(30), active: true },
      }),
    );
  }

  // ── orders → tickets → payments → redemptions ──
  let orderSeq = 0;
  let paySeq = 0;
  const soldByType = new Map(); // ticketTypeId → non-comp count
  const paidTicketsForCheckin = []; // {id, eventIdx}
  const orderPlans = [
    { eventIdx: 0, count: 12, window: [45, 34] }, // ENDED (older history, cohort)
    { eventIdx: 1, count: 14, window: [20, 0] }, // LIVE (recent → trend/heatmap)
    { eventIdx: 2, count: 5, window: [12, 0] }, // PUBLISHED (pre-sales)
  ];

  for (const plan of orderPlans) {
    const { event, ticketTypes } = events[plan.eventIdx];
    for (let i = 0; i < plan.count; i++) {
      const customer = pick(customers);
      const createdAt = faker.date.between({ from: daysAgo(plan.window[0]), to: daysAgo(plan.window[1]) });
      // status mix: mostly PAID
      const roll = faker.number.float({ min: 0, max: 1 });
      const status = roll < 0.72 ? "PAID" : roll < 0.8 ? "PENDING" : roll < 0.92 ? "FAILED" : "EXPIRED";

      // line items (respect group max 10)
      const chosen = some(ticketTypes, int(1, 2));
      const items = chosen.map((tt) => ({ ticketTypeId: tt.id, qty: int(1, 3) }));
      let totalQty = items.reduce((s, it) => s + it.qty, 0);
      while (totalQty > 10) { items[0].qty -= 1; totalQty -= 1; }
      const subtotal = items.reduce((s, it) => s + it.qty * ticketTypes.find((t) => t.id === it.ticketTypeId).priceInPaise, 0);

      // discount
      let discount = 0;
      let discountSource = "NONE";
      let couponId = null;
      const dRoll = faker.number.float({ min: 0, max: 1 });
      if (dRoll < 0.18) {
        const coupon = pick(coupons.filter((c) => !c.eventId || c.eventId === event.id));
        if (coupon && (!coupon.minOrder || subtotal >= coupon.minOrder)) {
          discount = coupon.type === "FLAT" ? coupon.value : Math.round((subtotal * coupon.value) / 100);
          discountSource = "COUPON";
          couponId = coupon.id;
        }
      } else if (dRoll < 0.28) {
        discount = Math.round(subtotal * 0.15);
        discountSource = "EARLY_BIRD";
      } else if (dRoll < 0.36 && totalQty > 5) {
        discount = Math.round(subtotal * 0.1);
        discountSource = "BULK";
      }
      const total = Math.max(0, subtotal - discount);

      const order = await db.order.create({
        data: {
          userId: customer.id,
          eventId: event.id,
          status,
          subtotal,
          discount,
          total,
          discountSource,
          couponId,
          gatewayOrderId: `odr_demo_${orderSeq++}`,
          items,
          utm: { source: pick(UTM_SOURCES), medium: pick(["cpc", "social", "referral", "none"]), campaign: pick(["spring24", "launch", "retarget", "none"]) },
          expiresAt: status === "PENDING" ? daysFromNow(1) : status === "EXPIRED" ? new Date(createdAt.getTime() + 15 * 60000) : null,
          createdAt,
        },
      });

      if (status === "PAID") {
        // tickets
        for (const it of items) {
          for (let q = 0; q < it.qty; q++) {
            const t = await db.ticket.create({
              data: {
                orderId: order.id,
                ticketTypeId: it.ticketTypeId,
                holderName: faker.person.fullName(),
                holderPhone: nextPhone(),
                holderEmail: faker.internet.email().toLowerCase(),
                qrToken: nextQr(),
                status: "VALID",
                createdAt,
              },
            });
            soldByType.set(it.ticketTypeId, (soldByType.get(it.ticketTypeId) ?? 0) + 1);
            if (plan.eventIdx < 2) paidTicketsForCheckin.push({ id: t.id, eventIdx: plan.eventIdx, createdAt });
          }
        }
        // payment
        const online = chance(0.7);
        const fee = online ? Math.round(total * 0.02) : null;
        await db.payment.create({
          data: {
            orderId: order.id,
            gateway: online ? "RAZORPAY" : "OFFLINE",
            mode: online ? "ONLINE" : "OFFLINE",
            gatewayRef: online ? `pay_demo_${paySeq++}` : null,
            amount: total,
            feePaise: fee,
            taxPaise: fee != null ? Math.round(fee * 0.18) : null,
            status: "CAPTURED",
            recordedById: online ? null : pick(staff).id,
            meta: online ? { method: pick(["upi", "card", "netbanking"]) } : { collectedAt: "gate" },
            createdAt,
          },
        });
        // redemption
        if (couponId) {
          await db.couponRedemption.create({ data: { couponId, userId: customer.id, orderId: order.id, createdAt } });
          await db.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
        }
      } else if (status === "FAILED") {
        await db.payment.create({ data: { orderId: order.id, gateway: "RAZORPAY", mode: "ONLINE", amount: total, status: "FAILED", meta: { error: "payment_failed" }, createdAt } });
      }
    }
  }

  // comps (free tickets under zero-value orders) on the LIVE event
  {
    const { event, ticketTypes } = events[1];
    for (let i = 0; i < 3; i++) {
      const compOrder = await db.order.create({
        data: { userId: ADMIN_ID, eventId: event.id, status: "PAID", subtotal: 0, discount: 0, total: 0, discountSource: "NONE", gatewayOrderId: `odr_demo_${orderSeq++}`, items: [], createdAt: daysAgo(int(1, 10)) },
      });
      const tt = pick(ticketTypes);
      for (let q = 0; q < int(1, 2); q++) {
        await db.ticket.create({ data: { orderId: compOrder.id, ticketTypeId: tt.id, holderName: faker.person.fullName(), qrToken: nextQr(), status: "VALID", isComp: true } });
      }
    }
  }

  // update soldQty (and force a sold-out type per event)
  for (const { ticketTypes } of events) {
    for (const tt of ticketTypes) {
      const sold = soldByType.get(tt.id) ?? 0;
      await db.ticketType.update({ where: { id: tt.id }, data: { soldQty: Math.min(sold, tt.totalQty) } });
    }
    // sold-out: set the Early Bird type's totalQty to its sold count (if any)
    const eb = ticketTypes[0];
    const ebSold = soldByType.get(eb.id) ?? 0;
    if (ebSold > 0) await db.ticketType.update({ where: { id: eb.id }, data: { totalQty: ebSold, soldQty: ebSold } });
  }

  // ── check-ins (set those tickets CHECKED_IN) across gates/time ──
  const toCheckIn = some(paidTicketsForCheckin, Math.min(16, paidTicketsForCheckin.length));
  let scanSeq = 0;
  for (const t of toCheckIn) {
    const ev = events[t.eventIdx];
    const at = t.eventIdx === 0 ? faker.date.between({ from: ev.spec.start, to: ev.spec.end }) : faker.date.recent({ days: 1 });
    await db.checkIn.create({ data: { ticketId: t.id, scannedById: pick(scanners).id, gate: pick(GATES), direction: chance(0.93) ? "IN" : "OUT", clientScanId: `scan_demo_${scanSeq++}`, scannedAt: at } });
    await db.ticket.update({ where: { id: t.id }, data: { status: "CHECKED_IN" } });
  }
  // a couple cancelled tickets
  const cancelable = some(paidTicketsForCheckin, 2);
  for (const t of cancelable) await db.ticket.update({ where: { id: t.id }, data: { status: "CANCELLED" } }).catch(() => {});

  // ── bookings (one active per stall) + payments ──
  const bookingStatuses = ["BOOKED", "BOOKED", "BOOKED", "BOOKED", "BOOKED", "PENDING", "PENDING", "HELD"];
  let bSeq = 0;
  for (let i = 0; i < bookingStatuses.length; i++) {
    const ev = events[i % 2]; // ENDED + LIVE events
    const stall = ev.stalls[i % ev.stalls.length];
    const status = bookingStatuses[i];
    const isAdmin = i >= 6; // last couple are admin-created
    const vendor = isAdmin ? null : pick(approvedVendors);
    const createdAt = faker.date.recent({ days: 30 });
    const booking = await db.booking.create({
      data: {
        eventId: ev.event.id,
        stallId: stall.id,
        vendorProfileId: vendor?.id ?? null,
        source: isAdmin ? "ADMIN" : "VENDOR",
        adminDetails: isAdmin ? { name: faker.company.name(), phone: nextPhone() } : undefined,
        status,
        gatewayOrderId: `bkorder_demo_${bSeq++}`,
        createdAt,
      },
    });
    await db.stall.update({ where: { id: stall.id }, data: { status } });
    if (status === "BOOKED" || status === "PENDING") {
      const online = chance(0.6);
      const amount = stall.priceInPaise ?? rupees(15000);
      const fee = online ? Math.round(amount * 0.02) : null;
      await db.payment.create({
        data: {
          bookingId: booking.id,
          gateway: online ? "RAZORPAY" : "OFFLINE",
          mode: online ? "ONLINE" : "OFFLINE",
          gatewayRef: online ? `pay_demo_${paySeq++}` : null,
          amount,
          feePaise: fee,
          taxPaise: fee != null ? Math.round(fee * 0.18) : null,
          status: "CAPTURED",
          recordedById: online ? null : ADMIN_ID,
          createdAt: new Date(createdAt.getTime() + int(1, 5) * 86400000),
        },
      });
    }
  }

  // ── sponsors (carry finance) ──
  const TIERS = ["TITLE", "POWERED_BY", "ZONE", "STALL", "ASSOCIATE"];
  for (const { event } of events) {
    for (let i = 0; i < int(2, 3); i++) {
      const status = pick(["PAID", "PAID", "SIGNED", "PROPOSED"]);
      await db.sponsor.create({
        data: {
          eventId: event.id,
          name: faker.company.name(),
          tier: TIERS[i % TIERS.length],
          logoUrl: IMG(pick(DEMO_IMAGES)),
          placements: { site: true, map: chance(0.5), ticket: chance(0.4), led: chance(0.3) },
          leadAccess: chance(0.5),
          amountPaise: rupees(int(5, 50) * 1000),
          status,
          paidAt: status === "PAID" ? faker.date.recent({ days: 25 }) : null,
          note: chance(0.5) ? faker.lorem.sentence() : null,
        },
      });
    }
  }

  // ── finance: budgets, expenses, schedules, settlements ──
  const CATS = ["VENUE", "MARKETING", "STAFF", "SECURITY", "LOGISTICS", "PRODUCTION", "TALENT", "FNB", "PERMIT", "MISC"];
  for (const { event, spec } of events) {
    // budgets — one per category
    for (const category of CATS) {
      await db.budget.create({ data: { eventId: event.id, category, plannedPaise: rupees(int(20, 200) * 1000) } });
    }
    // expenses — ~8 across categories, mixed status
    for (let i = 0; i < 8; i++) {
      const category = pick(CATS);
      const status = pick(["PAID", "PAID", "PAID", "APPROVED", "APPROVED", "DRAFT"]);
      const isPayout = chance(0.25) && approvedVendors.length > 0;
      await db.expense.create({
        data: {
          eventId: event.id,
          category: isPayout ? "VENDOR_PAYOUT" : category,
          vendorProfileId: isPayout ? pick(approvedVendors).id : null,
          title: isPayout ? "Vendor settlement" : faker.commerce.productName() + " — " + category.toLowerCase(),
          amountPaise: rupees(int(5, 120) * 1000),
          incurredAt: faker.date.between({ from: spec.start.getTime() < Date.now() ? spec.start : daysAgo(20), to: new Date() }),
          status,
          receiptUrl: chance(0.6) ? IMG(pick(DEMO_IMAGES)) : null,
          note: chance(0.4) ? faker.lorem.sentence() : null,
          recordedById: ADMIN_ID,
          approvedById: status === "DRAFT" ? null : ADMIN_ID,
        },
      });
    }
  }
  // expense schedules
  await db.expenseSchedule.create({ data: { eventId: events[1].event.id, category: "STAFF", title: "Weekly crew wages", amountPaise: rupees(40000), cadence: "WEEKLY", nextRunAt: daysFromNow(5), remaining: 6 } });
  await db.expenseSchedule.create({ data: { category: "MARKETING", title: "Monthly retainer (org-wide)", amountPaise: rupees(60000), cadence: "MONTHLY", nextRunAt: daysFromNow(12), remaining: null } });
  // settlements
  for (let i = 0; i < 3; i++) {
    const amount = rupees(int(50, 300) * 1000);
    const fee = Math.round(amount * 0.02);
    await db.settlement.create({ data: { gatewayRef: `setl_demo_${i}_${faker.string.alphanumeric(8)}`, amountPaise: amount - fee, feePaise: fee, taxPaise: Math.round(fee * 0.18), settledAt: faker.date.recent({ days: 20 }), status: pick(["RECONCILED", "RECONCILED", "UNMATCHED"]) } });
  }

  // ── waitlist ──
  for (let i = 0; i < 7; i++) {
    const type = chance(0.5) ? "TICKET" : "STALL";
    const src = chance(0.4) ? "PLATFORM" : "EVENT";
    const withUser = chance(0.5);
    const cust = pick(customers);
    await db.waitlist.create({
      data: {
        source: src,
        eventId: src === "EVENT" ? pick(events).event.id : null,
        type,
        userId: withUser ? cust.id : null,
        name: withUser ? null : faker.person.fullName(),
        email: faker.internet.email().toLowerCase(),
        phone: nextPhone(),
        contact: nextPhone(),
        meta: type === "STALL" ? { stallType: pick(["Small", "Premium"]) } : {},
        notifiedAt: chance(0.3) ? faker.date.recent({ days: 10 }) : null,
      },
    });
  }

  // ── leads (per approved vendor) ──
  for (const v of approvedVendors) {
    for (let i = 0; i < int(2, 3); i++) {
      await db.lead.create({ data: { eventId: pick(events).event.id, vendorProfileId: v.id, name: faker.person.fullName(), phone: nextPhone(), email: faker.internet.email().toLowerCase(), consent: true, createdAt: faker.date.recent({ days: 20 }) } });
    }
  }

  // ── campaigns ──
  for (const c of [
    { name: "Spring launch blast", channel: "EMAIL", status: "COMPLETED", sentCount: 1240 },
    { name: "Final 48 hours", channel: "WHATSAPP", status: "COMPLETED", sentCount: 860 },
    { name: "Winter teaser", channel: "EMAIL", status: "DRAFT", sentCount: 0 },
  ]) {
    await db.campaign.create({ data: { ...c, eventId: pick(events).event.id, audience: pick(["ALL", "BUYERS"]), subject: faker.lorem.sentence(), body: faker.lorem.paragraph(), sentAt: c.status === "SENT" ? faker.date.recent({ days: 15 }) : null, createdById: ADMIN_ID } });
  }

  // ── notifications ──
  for (let i = 0; i < 6; i++) {
    const type = pick(["PAYMENT_CAPTURED", "VENDOR_APPROVAL", "FINANCE_DIGEST", "STALL_BOOKED"]);
    await db.notification.create({ data: { type, title: faker.lorem.sentence(4), body: faker.lorem.sentence(), href: "/dashboard", eventId: pick(events).event.id, readAt: chance(0.5) ? faker.date.recent({ days: 5 }) : null, createdAt: faker.date.recent({ days: 12 }) } });
  }

  // ── outbox (terminal states only — the live processor must never pick up demo rows) ──
  for (let i = 0; i < 8; i++) {
    const status = pick(["SENT", "SENT", "SENT", "SENT", "SENT", "FAILED"]);
    await db.outbox.create({
      data: {
        channel: pick(["EMAIL", "WHATSAPP", "SMS"]),
        toAddress: faker.internet.email().toLowerCase(),
        template: pick(["ticket", "reminder", "finance-digest"]),
        payload: { demo: true, i },
        status,
        attempts: status === "FAILED" ? 5 : 1, // FAILED at max attempts → not retried
        lastError: status === "FAILED" ? "SMTP timeout" : null,
        dedupeKey: `demo:outbox:${i}`,
        sentAt: status === "SENT" ? faker.date.recent({ days: 10 }) : null,
      },
    });
  }

  // ── audit log ──
  const ACTIONS = ["CREATE", "UPDATE", "APPROVE", "DELETE", "COMP_ISSUE", "EXPENSE_CREATE", "EXPENSE_STATUS", "REFUND_DENIED", "VENDOR_APPROVE"];
  const ENTITIES = ["Order", "Payment", "Booking", "VendorProfile", "Expense", "Coupon", "Ticket"];
  for (let i = 0; i < 22; i++) {
    await db.auditLog.create({
      data: {
        actorId: ADMIN_ID,
        role: "SUPER_ADMIN",
        action: pick(ACTIONS),
        entity: pick(ENTITIES),
        entityId: faker.string.uuid(),
        before: chance(0.5) ? { status: "DRAFT" } : undefined,
        after: { status: pick(["APPROVED", "PAID", "BOOKED"]) },
        ip: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
        createdAt: faker.date.recent({ days: 30 }),
      },
    });
  }

  // ── summary ──
  const counts = {};
  for (const m of ["user", "event", "ticketType", "stall", "order", "ticket", "payment", "coupon", "couponRedemption", "vendorProfile", "booking", "checkIn", "sponsor", "expense", "budget", "settlement", "waitlist", "lead", "campaign", "notification", "outbox", "auditLog"]) {
    counts[m] = await db[m].count();
  }
  console.log("✓ Demo seed complete:", JSON.stringify(counts, null, 2));
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
