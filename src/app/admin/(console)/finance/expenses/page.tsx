import type { Metadata } from "next";
import { fmtDate } from "@/lib/date-formats";
import { requirePermission } from "@/server/auth/guard";
import { listExpenses, listVendorOptions } from "@/server/finance/expenses";
import { listAllForAdmin } from "@/server/events/service";
import { EXPENSE_CATEGORIES } from "@/server/schemas";
import { formatPaise } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { ReceiptUploader } from "./ReceiptUploader";
import { saveExpenseAction, setExpenseStatusAction, deleteExpenseAction } from "./actions";

export const metadata: Metadata = { title: "Expenses" };

const STATUS_VARIANT = { DRAFT: "neutral", APPROVED: "warning", PAID: "success" } as const;

const today = () => new Date().toISOString().slice(0, 10);

export default async function ExpensesPage() {
  await requirePermission("FINANCE_MANAGE");
  const [expenses, events, vendors] = await Promise.all([
    listExpenses(),
    listAllForAdmin(),
    listVendorOptions(),
  ]);
  const total = expenses.reduce((s, e) => s + e.amountPaise, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader title="Expenses" description="The cost side of the books. Approved/paid expenses feed event P&L and ROI." />
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/export/expenses">Download CSV</a>
        </Button>
      </div>

      <form action={saveExpenseAction} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">New expense</h2>
          <p className="text-sm text-muted-foreground">Amounts in ₹. Leave event blank for org-wide overhead.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" className="sm:col-span-2">
            <Input name="title" required placeholder="Stage & sound rental" />
          </Field>
          <Field label="Category">
            <Select name="category" defaultValue="MISC">
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </Select>
          </Field>
          <Field label="Amount (₹)">
            <Input type="number" name="amountRupees" min={0} step="0.01" required placeholder="25000" />
          </Field>
          <Field label="Event">
            <Select name="eventId" defaultValue="">
              <option value="">Org-wide (no event)</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </Select>
          </Field>
          <Field label="Vendor (optional)" hint="For vendor payouts.">
            <Select name="vendorProfileId" defaultValue="">
              <option value="">None</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.brandName}</option>)}
            </Select>
          </Field>
          <Field label="Incurred on">
            <Input type="date" name="incurredAt" defaultValue={today()} required />
          </Field>
          <Field label="Status">
            <Select name="status" defaultValue="DRAFT">
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
            </Select>
          </Field>
          <Field label="Note" className="sm:col-span-2">
            <Input name="note" placeholder="Optional reference / invoice no." />
          </Field>
          <div className="sm:col-span-2"><ReceiptUploader /></div>
          <Button type="submit" className="w-fit sm:col-span-2">Add expense</Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">
          All expenses ({expenses.length}) · {formatPaise(total)}
        </h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses yet — add your first one above.</p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {expenses.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    {e.title}
                    <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.category.replace(/_/g, " ")} · {formatPaise(e.amountPaise)} · {fmtDate(e.incurredAt)}
                    {" · "}{e.event?.name ?? "Org-wide"}
                    {e.vendorProfile ? ` · ${e.vendorProfile.brandName}` : ""}
                    {e.receiptUrl ? " · " : ""}
                    {e.receiptUrl && <a href={e.receiptUrl} target="_blank" rel="noreferrer" className="underline">receipt</a>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {e.status !== "PAID" && (
                    <form action={setExpenseStatusAction}>
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="status" value={e.status === "DRAFT" ? "APPROVED" : "PAID"} />
                      <Button type="submit" variant="ghost" size="sm">
                        {e.status === "DRAFT" ? "Approve" : "Mark paid"}
                      </Button>
                    </form>
                  )}
                  <form action={deleteExpenseAction}>
                    <input type="hidden" name="id" value={e.id} />
                    <Button type="submit" variant="ghost" size="sm">Delete</Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
