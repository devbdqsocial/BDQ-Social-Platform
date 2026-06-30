import { AsyncLocalStorage } from "node:async_hooks";
import { Prisma, PrismaClient } from "@prisma/client";

/** Prisma singleton (avoids exhausting connections in dev/serverless). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const txStore = new AsyncLocalStorage<Prisma.TransactionClient>();

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export function runInDbTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  const active = txStore.getStore();
  if (active) return fn(active);
  return prisma.$transaction((tx) => txStore.run(tx, () => fn(tx)));
}

export const db = new Proxy(prisma, {
  get(target, prop, receiver) {
    const active = txStore.getStore();
    if (!active) {
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    }
    if (prop === "$transaction") {
      return async (arg: unknown) => {
        if (typeof arg === "function") return (arg as (tx: Prisma.TransactionClient) => Promise<unknown>)(active);
        if (Array.isArray(arg)) return Promise.all(arg);
        throw new Error("Unsupported nested transaction");
      };
    }
    const value = Reflect.get(active, prop, active);
    return typeof value === "function" ? value.bind(active) : value;
  },
}) as PrismaClient;
