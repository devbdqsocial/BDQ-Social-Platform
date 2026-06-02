/** Offline check-in queue. Pure array ops + a localStorage store (client-only). */

export interface QueuedScan {
  clientScanId: string;
  qrToken: string;
  gate?: string;
}

export function addToQueue(queue: QueuedScan[], item: QueuedScan): QueuedScan[] {
  if (queue.some((q) => q.clientScanId === item.clientScanId)) return queue;
  return [...queue, item];
}

export function removeFromQueue(queue: QueuedScan[], clientScanId: string): QueuedScan[] {
  return queue.filter((q) => q.clientScanId !== clientScanId);
}

const KEY = "bdq:scanqueue:v1";

export function loadQueue(): QueuedScan[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveQueue(queue: QueuedScan[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(queue));
}
