import { resolveBookingContract, bookingTokenContext } from "@/server/legal/resolve";
import { mergeSections } from "@/server/legal/tokens";
import { DocSectionsView } from "@/components/legal/DocSections";

/** Server component: the exact per-event agreement this booking's vendor is about to sign
 *  (resolved stall type → event default → global default, tokens merged). */
export async function BookingContractView({ bookingId }: { bookingId: string }) {
  const [template, ctx] = await Promise.all([resolveBookingContract(bookingId), bookingTokenContext(bookingId)]);
  const { sections } = mergeSections(template.sections, { ...ctx, doc: { version: template.version } });
  return (
    <details className="group rounded-[var(--radius-lg)] p-[var(--space-lg)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
      <summary className="f-paragraph-small flex cursor-pointer list-none items-center justify-between gap-[var(--space-md)] font-bold">
        Read this event&apos;s agreement — {template.title} ({template.version})
        <span aria-hidden className="shrink-0 transition-transform duration-300 group-open:rotate-45">+</span>
      </summary>
      <div className="f-paragraph-small mt-[var(--space-md)] max-h-[50vh] overflow-y-auto pr-[var(--space-md)] [&_a]:underline [&_h2]:mt-[var(--space-lg)] [&_h2]:font-bold [&_h2]:first:mt-0 [&_li]:mb-[var(--space-2xs)] [&_li]:opacity-80 [&_ol]:mt-[var(--space-sm)] [&_ol]:list-decimal [&_ol]:pl-[var(--space-lg)] [&_p]:mt-[var(--space-sm)] [&_p]:opacity-80 [&_strong]:font-bold [&_ul]:mt-[var(--space-sm)] [&_ul]:list-disc [&_ul]:pl-[var(--space-lg)]">
        <DocSectionsView sections={sections} />
      </div>
    </details>
  );
}
