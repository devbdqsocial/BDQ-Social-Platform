import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Admin coupon management. Checkout-side validation lives in tickets/service (resolveCoupon). */

export interface CouponInput {
  code: string;
  type: "FLAT" | "PERCENT";
  value: number;
  maxUses?: number;
  perUserLimit: number;
  minOrder?: number;
  startsAt?: Date;
  endsAt?: Date;
  active: boolean;
  eventId?: string;
}

export function listCoupons() {
  return db.coupon.findMany({
    orderBy: { code: "asc" },
    include: { event: { select: { name: true } }, _count: { select: { orders: true } } },
  });
}

export class CouponCodeTakenError extends Error {
  constructor() {
    super("CODE_TAKEN");
    this.name = "CouponCodeTakenError";
  }
}

export function createCoupon(session: Session, input: CouponInput) {
  return withAudit(session, { action: "CREATE", entity: "Coupon", entityId: input.code }, async () => ({
    before: null,
    run: async () => {
      try {
        const c = await db.coupon.create({
          data: {
            code: input.code,
            type: input.type,
            value: input.value,
            maxUses: input.maxUses ?? null,
            perUserLimit: input.perUserLimit,
            minOrder: input.minOrder ?? null,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            active: input.active,
            eventId: input.eventId ?? null,
          },
        });
        return { result: c, after: { code: c.code, type: c.type, value: c.value, active: c.active } };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new CouponCodeTakenError();
        throw e;
      }
    },
  }));
}

export function setCouponActive(session: Session, id: string, active: boolean) {
  return withAudit(session, { action: active ? "ENABLE" : "DISABLE", entity: "Coupon", entityId: id }, async () => {
    const before = await db.coupon.findUnique({ where: { id }, select: { active: true } });
    return {
      before,
      run: async () => {
        const c = await db.coupon.update({ where: { id }, data: { active } });
        return { result: c, after: { active: c.active } };
      },
    };
  });
}
