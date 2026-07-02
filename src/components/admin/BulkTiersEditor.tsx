"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const MAX_TIERS = 5;
const PLACEHOLDERS = [
  { minQty: "6", percent: "5" },
  { minQty: "10", percent: "10" },
  { minQty: "20", percent: "15" },
];

/** Bulk-tier rows with explicit add/remove (replaces the fixed blank-row convention). Submits
 * `minQty{i}/percent{i}` pairs consumed by setPricingRulesAction. */
export function BulkTiersEditor({ defaults }: { defaults: { minQty: number; percent: number }[] }) {
  const [rows, setRows] = useState<{ minQty: string; percent: string }[]>(
    defaults.length > 0 ? defaults.map((t) => ({ minQty: String(t.minQty), percent: String(t.percent) })) : [{ minQty: "", percent: "" }],
  );

  return (
    <div className="grid gap-4">
      {rows.map((row, i) => (
        <div key={i} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
          <Field label={`Tier ${i + 1} — min tickets`}>
            <Input type="number" name={`minQty${i}`} min={6} value={row.minQty} placeholder={PLACEHOLDERS[i]?.minQty ?? ""}
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, minQty: e.target.value } : r)))} />
          </Field>
          <Field label="Discount (%)">
            <Input type="number" name={`percent${i}`} min={0} max={100} value={row.percent} placeholder={PLACEHOLDERS[i]?.percent ?? ""}
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, percent: e.target.value } : r)))} />
          </Field>
          <Button type="button" variant="ghost" size="sm" onClick={() => setRows(rows.filter((_, j) => j !== i))} disabled={rows.length === 1 && !row.minQty && !row.percent}>
            Remove
          </Button>
        </div>
      ))}
      {rows.length < MAX_TIERS && (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => setRows([...rows, { minQty: "", percent: "" }])}>
          + Add tier
        </Button>
      )}
    </div>
  );
}
