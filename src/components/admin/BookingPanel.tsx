"use client";

import { ActionForm } from "@/components/admin/action-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Select } from "@/components/ui/input";
import { ARTIST_BOOKING_STATUS, ARTIST_SETTLEMENT } from "@/lib/status-badges";
import { updateBookingAction, logNegotiationAction, setBookingStatusAction, recordPayoutAction } from "@/app/admin/(console)/artists/booking-actions";

export interface BookingPanelData {
  id: string;
  artistId: string;
  eventId: string;
  status: string;
  settlement: string;
  agreedFeePaise: number;
  setStartsAt: string | null;
  setEndsAt: string | null;
  stageOrZone: string | null;
  published: boolean;
  negotiationNote: string | null;
  payouts: { amountPaise: number; status: string; incurredAt: string }[];
}

const inr = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

/** One artist booking: fee + set time + publish, a negotiation log, and confirm/cancel. */
export function BookingPanel({ booking, title }: { booking: BookingPanelData; title: string }) {
  const st = ARTIST_BOOKING_STATUS[booking.status];
  const settle = ARTIST_SETTLEMENT[booking.settlement];
  const hidden = (
    <>
      <input type="hidden" name="id" value={booking.id} />
      <input type="hidden" name="artistId" value={booking.artistId} />
      <input type="hidden" name="eventId" value={booking.eventId} />
    </>
  );

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <div className="flex items-center gap-2">
          {st && <Badge variant={st.variant}>{st.label}</Badge>}
          {settle && <Badge variant={settle.variant}>{settle.label}</Badge>}
        </div>
      </div>

      {/* Fee + set time + publish */}
      <ActionForm action={updateBookingAction} success="Booking updated" className="grid gap-3 sm:grid-cols-2">
        {hidden}
        <Field label="Agreed fee (₹)">
          <Input name="agreedFeeRupees" type="number" min={0} step={1} defaultValue={String(booking.agreedFeePaise / 100)} />
        </Field>
        <Field label="Stage / zone">
          <Input name="stageOrZone" defaultValue={booking.stageOrZone ?? ""} placeholder="Main Stage" />
        </Field>
        <Field label="Set starts">
          <DateTimePicker name="setStartsAt" defaultValue={booking.setStartsAt ?? undefined} />
        </Field>
        <Field label="Set ends">
          <DateTimePicker name="setEndsAt" defaultValue={booking.setEndsAt ?? undefined} />
        </Field>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="published" defaultChecked={booking.published} className="size-4 rounded border-input accent-primary" />
          Show this set on the public lineup (when confirmed)
        </label>
        <Button type="submit" size="sm" className="w-fit sm:col-span-2">Save</Button>
      </ActionForm>

      {/* Negotiation */}
      <ActionForm action={logNegotiationAction} success="Logged" resetOnSuccess className="grid gap-2 border-t pt-3">
        {hidden}
        {booking.negotiationNote && <p className="text-xs text-muted-foreground">Last note: {booking.negotiationNote}</p>}
        <Field label="Negotiation note">
          <Textarea name="note" rows={2} placeholder="Quoted ₹X, agreed ₹Y after call…" />
        </Field>
        <div className="flex flex-wrap items-end gap-2">
          <Field label="New agreed fee (₹)" hint="Optional">
            <Input name="agreedFeeRupees" type="number" min={0} step={1} placeholder="leave blank to keep" />
          </Field>
          <Button type="submit" size="sm" variant="outline">Log negotiation</Button>
        </div>
      </ActionForm>

      {/* Settlement */}
      {(() => {
        const paid = booking.payouts.filter((p) => p.status === "APPROVED" || p.status === "PAID").reduce((s, p) => s + p.amountPaise, 0);
        const balance = Math.max(0, booking.agreedFeePaise - paid);
        return (
          <div className="grid gap-2 border-t pt-3">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>Agreed <strong>{inr(booking.agreedFeePaise)}</strong></span>
              <span>Paid <strong>{inr(paid)}</strong></span>
              <span>Balance <strong>{inr(balance)}</strong></span>
            </div>
            {booking.payouts.length > 0 && (
              <ul className="text-xs text-muted-foreground">
                {booking.payouts.map((p, i) => (
                  <li key={i}>{new Date(p.incurredAt).toLocaleDateString("en-IN")} · {inr(p.amountPaise)} · {p.status}</li>
                ))}
              </ul>
            )}
            <ActionForm action={recordPayoutAction} success="Payout recorded" resetOnSuccess className="flex flex-wrap items-end gap-2">
              {hidden}
              <Field label="Record payout (₹)">
                <Input name="payoutRupees" type="number" min={1} step={1} placeholder="20000" />
              </Field>
              <Field label="Status">
                <Select name="payoutStatus" defaultValue="PAID">
                  <option value="PAID">Paid</option>
                  <option value="APPROVED">Approved</option>
                  <option value="DRAFT">Draft</option>
                </Select>
              </Field>
              <Button type="submit" size="sm" variant="outline">Record</Button>
            </ActionForm>
          </div>
        );
      })()}

      {/* Status */}
      <div className="flex flex-wrap gap-2 border-t pt-3">
        {booking.status !== "CONFIRMED" && (
          <ActionForm action={setBookingStatusAction} success="Confirmed">
            {hidden}
            <input type="hidden" name="status" value="CONFIRMED" />
            <Button type="submit" size="sm">Confirm booking</Button>
          </ActionForm>
        )}
        {booking.status !== "CANCELLED" && (
          <ActionForm action={setBookingStatusAction} success="Cancelled">
            {hidden}
            <input type="hidden" name="status" value="CANCELLED" />
            <Button type="submit" size="sm" variant="ghost" className="text-destructive">Cancel</Button>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
