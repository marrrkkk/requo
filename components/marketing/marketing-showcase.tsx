export function MarketingShowcase() {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <div
        aria-label="Placeholder screenshot of the Requo quote workflow"
        className="aspect-[16/10] w-full overflow-hidden rounded-xl border border-border/80 bg-background/95 shadow-[var(--surface-shadow-lg)] sm:aspect-[16/9]"
        role="img"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-border/70 bg-muted/35 px-3 sm:h-12 sm:px-4">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2 rounded-full bg-border" />
              <span className="size-2 rounded-full bg-border" />
              <span className="size-2 rounded-full bg-border" />
            </div>
            <div className="hidden h-2.5 w-40 rounded-full bg-border/75 sm:block" />
            <div className="h-6 w-16 rounded-md bg-primary/12 sm:w-24" />
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-[4.25rem_minmax(0,1fr)] sm:grid-cols-[12rem_minmax(0,1fr)]">
            <aside className="border-r border-border/70 bg-muted/20 px-2 py-3 sm:px-4 sm:py-5">
              <div className="hidden h-3 w-24 rounded-full bg-foreground/10 sm:block" />
              <div className="mt-5 grid gap-2 sm:gap-2.5">
                {["Inbox", "Quotes", "Follow-up", "Won"].map((label, index) => (
                  <div
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-muted-foreground"
                    key={label}
                  >
                    <span
                      className={
                        index === 1
                          ? "size-2 rounded-full bg-primary"
                          : "size-2 rounded-full bg-border"
                      }
                    />
                    <span className="hidden truncate sm:inline">{label}</span>
                  </div>
                ))}
              </div>
            </aside>

            <div className="min-w-0 bg-background/85">
              <div className="flex items-start justify-between gap-4 border-b border-border/70 px-4 py-4 sm:px-6 sm:py-5">
                <div className="min-w-0">
                  <p className="meta-label">Quote pipeline</p>
                  <div className="mt-3 h-4 w-44 max-w-full rounded-full bg-foreground/10 sm:w-64" />
                </div>
                <div className="hidden rounded-lg border border-border/70 bg-accent/45 px-3 py-2 text-xs font-medium text-primary sm:block">
                  Follow-up due today
                </div>
              </div>

              <div className="grid px-4 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <div className="min-w-0 overflow-hidden border border-border/70 bg-background lg:border-r-0">
                  <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] border-b border-border/70 bg-muted/25 px-3 py-2 text-[0.68rem] font-medium uppercase tracking-[0.14em] text-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-4">
                    <span>Customer</span>
                    <span>Status</span>
                    <span>Total</span>
                  </div>
                  <div className="divide-y divide-border/70">
                    {[
                      ["Kitchen refresh", "Viewed", "$4.8k"],
                      ["Studio fit-out", "Draft", "$7.2k"],
                      ["Repair package", "Accepted", "$1.6k"],
                    ].map(([name, status, amount]) => (
                      <div
                        className="grid grid-cols-[minmax(0,1fr)_5rem_5rem] items-center gap-2 px-3 py-3 text-xs sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:px-4 sm:text-sm"
                        key={name}
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {name}
                          </p>
                          <div className="mt-1.5 h-2 w-20 rounded-full bg-border/70 sm:w-32" />
                        </div>
                        <span className="truncate text-muted-foreground">
                          {status}
                        </span>
                        <span className="font-medium text-foreground">{amount}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden min-w-0 flex-col border border-border/70 bg-muted/20 lg:flex">
                  <div className="border-b border-border/70 px-4 py-4">
                    <p className="meta-label">Quote status</p>
                    <div className="mt-4 grid gap-3">
                      {["Viewed", "Accepted", "Follow-up"].map((label, index) => (
                        <div
                          className="flex items-center justify-between gap-3 text-sm"
                          key={label}
                        >
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium text-foreground">
                            {[12, 5, 3][index]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 py-4">
                    <p className="meta-label">Next step</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Send a short follow-up for the quotes viewed this week.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
