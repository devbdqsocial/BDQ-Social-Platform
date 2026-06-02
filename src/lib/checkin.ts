/** Pure scan classifier (Docs/project.md §10). DB-free so it's unit-testable. */

export type ScanResult = "VALID" | "ALREADY_USED" | "INVALID";

export function classifyScan(ticketStatus: string | null | undefined): ScanResult {
  if (ticketStatus === "VALID") return "VALID";
  if (ticketStatus === "CHECKED_IN") return "ALREADY_USED";
  return "INVALID"; // not found / CANCELLED
}
