import { Button } from "@/components/ui/button";
import { QuoteLibraryEntryCard } from "@/features/quotes/components/quote-library-entry-card";
import { QuoteLibraryEntryForm } from "@/features/quotes/components/quote-library-entry-form";
import type {
  DashboardQuoteLibraryEntry,
  QuoteLibraryActionState,
  QuoteLibraryDeleteActionState,
} from "@/features/quotes/types";

type BusinessPricingLibraryManagerProps = {
  currency: string;
  quoteLibrary: DashboardQuoteLibraryEntry[];
  createAction: (
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  updateAction: (
    entryId: string,
    state: QuoteLibraryActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryActionState>;
  deleteAction: (
    entryId: string,
    state: QuoteLibraryDeleteActionState,
    formData: FormData,
  ) => Promise<QuoteLibraryDeleteActionState>;
};

export function BusinessPricingLibraryManager({
  currency,
  quoteLibrary,
  createAction,
  updateAction,
  deleteAction,
}: BusinessPricingLibraryManagerProps) {
  const pricingBlocks = quoteLibrary.filter((entry) => entry.kind === "block");
  const servicePackages = quoteLibrary.filter((entry) => entry.kind === "package");

  return (
    <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)] xl:gap-7">
      <div className="self-start xl:sticky xl:top-6">
        <div className="soft-panel flex flex-col gap-5 p-5 shadow-none sm:p-6">
          <div className="space-y-2">
            <p className="text-[0.72rem] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Pricing library
            </p>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Reusable pricing
              </h2>
              <p className="text-sm text-muted-foreground">
                Blocks and packages for faster quote building.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-5 py-5">
            <div className="grid gap-4">
              <PricingSummaryRow
                label="Saved entries"
                value={String(quoteLibrary.length)}
              />
              <PricingSummaryRow
                label="Pricing blocks"
                value={String(pricingBlocks.length)}
              />
              <PricingSummaryRow
                label="Service packages"
                value={String(servicePackages.length)}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-border/75 bg-background/80 px-4 py-4">
            <p className="text-sm font-medium text-foreground">Best for repeat work.</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Save common services, scope bundles, and package pricing so new quotes
              start faster.
            </p>
          </div>

          <Button asChild className="w-full">
            <a href="#quote-library-create-kind">New pricing entry</a>
          </Button>
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Create pricing entry
              </h2>
              <p className="text-sm text-muted-foreground">
                Save a reusable block or package.
              </p>
            </div>

            <QuoteLibraryEntryForm
              action={createAction}
              currency={currency}
              idPrefix="quote-library-create"
              submitLabel="Save pricing entry"
              submitPendingLabel="Saving pricing entry..."
            />
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Pricing blocks
              </h2>
              <p className="text-sm text-muted-foreground">
                Individual reusable services and line items.
              </p>
            </div>

            {pricingBlocks.length ? (
              <div className="flex flex-col gap-4">
                {pricingBlocks.map((entry, index) => (
                  <QuoteLibraryEntryCard
                    action={updateAction.bind(null, entry.id)}
                    animationDelayMs={Math.min(index * 45, 180)}
                    currency={currency}
                    deleteAction={deleteAction.bind(null, entry.id)}
                    entry={entry}
                    key={entry.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-10 text-center">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  No pricing blocks yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Save a reusable pricing block to use it in future quotes.
                </p>
                <Button asChild className="mt-5">
                  <a href="#quote-library-create-kind">Save first block</a>
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="section-panel p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Service packages
              </h2>
              <p className="text-sm text-muted-foreground">
                Multi-line bundles ready to reuse.
              </p>
            </div>

            {servicePackages.length ? (
              <div className="flex flex-col gap-4">
                {servicePackages.map((entry, index) => (
                  <QuoteLibraryEntryCard
                    action={updateAction.bind(null, entry.id)}
                    animationDelayMs={Math.min(index * 45, 180)}
                    currency={currency}
                    deleteAction={deleteAction.bind(null, entry.id)}
                    entry={entry}
                    key={entry.id}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border/80 bg-muted/10 px-5 py-10 text-center">
                <p className="text-base font-semibold tracking-tight text-foreground">
                  No service packages yet
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Save a package to reuse bundled pricing in future quotes.
                </p>
                <Button asChild className="mt-5">
                  <a href="#quote-library-create-kind">Save first package</a>
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function PricingSummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tracking-tight text-foreground">{value}</p>
    </div>
  );
}
