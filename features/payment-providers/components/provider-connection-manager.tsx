"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "@/components/base/notification/notify";
import { StatusBadge, type StatusTone } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  connectProviderAction,
  disconnectProviderAction,
  startStripeConnectAction,
  type ProviderConnectionActionState,
  type ProviderPaymentActionState,
} from "@/features/payment-providers/actions";
import type { ProviderConnectionView } from "@/features/payment-providers/queries";

const PROVIDERS = [
  { value: "paymongo", label: "PayMongo", fields: ["secretKey", "webhookSecret"] },
  { value: "stripe", label: "Stripe", fields: ["secretKey", "webhookSecret"] },
  { value: "paypal", label: "PayPal", fields: ["clientId", "clientSecret", "webhookId"] },
] as const;

const FIELD_LABELS: Record<string, string> = {
  secretKey: "Secret key",
  webhookSecret: "Webhook secret",
  clientId: "Client ID",
  clientSecret: "Client secret",
  webhookId: "Webhook ID",
};

/**
 * Connection status vocabulary (ADR-013). `ready` means capable — able to
 * charge and refund — never merely "the owner finished a provider flow".
 */
const STATUS_DISPLAY: Record<ProviderConnectionView["status"], { tone: StatusTone; label: string }> = {
  onboarding: { tone: "info", label: "Setup incomplete" },
  action_required: { tone: "warning", label: "Action required" },
  ready: { tone: "success", label: "Ready" },
  revoked: { tone: "danger", label: "Revoked" },
};

function ConnectionSummary({ connections }: { connections: ProviderConnectionView[] }) {
  if (connections.length === 0) {
    return <p className="text-sm text-muted-foreground">Not connected</p>;
  }
  return (
    <ul className="flex flex-col gap-1.5">
      {connections.map((connection) => (
        <li key={connection.id} className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <StatusBadge tone={STATUS_DISPLAY[connection.status].tone} label={STATUS_DISPLAY[connection.status].label} size="sm" />
          <span>
            {connection.environment} · {connection.publicHint ?? "••••"}
          </span>
          <span className="text-xs">{connection.authMode === "platform" ? "Linked account" : "Keys"}</span>
        </li>
      ))}
    </ul>
  );
}

function DisconnectForm({ connection }: { connection: ProviderConnectionView }) {
  const [state, formAction, pending] = useActionState(
    disconnectProviderAction,
    {} as ProviderConnectionActionState,
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="connectionId" value={connection.id} />
      <span className="text-sm text-muted-foreground">
        {connection.environment} · {connection.publicHint ?? "••••"}
      </span>
      <Button type="submit" disabled={pending} variant="ghost">
        {pending ? "Disconnecting…" : "Disconnect"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}
    </form>
  );
}

/** Advanced fallback: the owner pastes merchant keys directly (ADR-013). */
function CredentialForm({
  provider,
  fields,
  existing,
}: {
  provider: string;
  fields: readonly string[];
  existing: ProviderConnectionView[];
}) {
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [state, formAction, pending] = useActionState(
    connectProviderAction,
    {} as ProviderConnectionActionState,
  );

  return (
    <div className="flex flex-col gap-3">
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="provider" value={provider} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="meta-label">Environment</span>
          <select
            name="environment"
            value={environment}
            onChange={(e) => setEnvironment(e.target.value as "test" | "live")}
            className="rounded border border-input bg-background px-2 py-1.5 text-sm"
          >
            <option value="test">Test</option>
            <option value="live">Live</option>
          </select>
        </label>
        {fields.map((field) => (
          <label key={field} className="flex flex-col gap-1 text-sm">
            <span className="meta-label">{FIELD_LABELS[field] ?? field}</span>
            <Input name={field} type="password" autoComplete="off" placeholder={FIELD_LABELS[field] ?? field} />
          </label>
        ))}
        <div>
          <Button type="submit" disabled={pending} variant="outline">
            {pending ? "Connecting…" : existing.length ? "Replace keys" : "Connect"}
          </Button>
        </div>
        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.success ? <p className="text-sm text-muted-foreground">{state.success}</p> : null}
      </form>

      {existing.map((connection) => (
        <DisconnectForm key={connection.id} connection={connection} />
      ))}
    </div>
  );
}

/**
 * Platform link (Stripe Connect). Requo holds the platform credentials; the
 * business authorizes its own account through Stripe's hosted onboarding, so
 * no merchant secret is ever pasted.
 *
 * Always visible — it is the primary path, and hiding it left owners with no
 * way to discover it. When the platform is not configured the control is
 * disabled with the reason instead of silently disappearing, and pasted keys
 * remain reachable as the Advanced fallback.
 */
function StripePlatformConnect({
  existing,
  enabled,
}: {
  existing: ProviderConnectionView[];
  enabled: boolean;
}) {
  const [environment, setEnvironment] = useState<"test" | "live">("test");
  const [state, formAction, pending] = useActionState(
    startStripeConnectAction,
    {} as ProviderPaymentActionState,
  );

  useEffect(() => {
    if (state.checkoutUrl) window.location.href = state.checkoutUrl;
  }, [state.checkoutUrl]);

  const platformRows = existing.filter((connection) => connection.authMode === "platform");
  const incomplete = platformRows.find((connection) => connection.status !== "ready");
  const isReady = platformRows.some((connection) => connection.status === "ready");

  return (
    <div className="flex flex-col gap-3">
      {incomplete ? (
        <form action={formAction} className="flex flex-col gap-2">
          <input type="hidden" name="environment" value={incomplete.environment} />
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Opening Stripe…
                </>
              ) : incomplete.status === "revoked" ? (
                "Reconnect with Stripe"
              ) : (
                "Finish Stripe setup"
              )}
            </Button>
          </div>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : isReady ? null : (
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="meta-label">Environment</span>
              <select
                name="environment"
                value={environment}
                onChange={(e) => setEnvironment(e.target.value as "test" | "live")}
                disabled={!enabled}
                className="rounded border border-input bg-background px-2 py-1.5 text-sm"
              >
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </label>
            <Button type="submit" disabled={pending || !enabled}>
              {pending ? (
                <>
                  <Spinner data-icon="inline-start" aria-hidden="true" />
                  Opening Stripe…
                </>
              ) : (
                "Connect with Stripe"
              )}
            </Button>
          </div>
          {!enabled ? (
            <p className="text-sm text-muted-foreground">
              Not available yet: this Requo deployment has no Stripe platform account configured. Set
              {" "}
              <code className="text-xs">STRIPE_PLATFORM_SECRET_KEY</code> and
              {" "}
              <code className="text-xs">STRIPE_PLATFORM_WEBHOOK_SECRET</code>, then restart the app. Until
              then, connect with your own Stripe keys below.
            </p>
          ) : null}
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </form>
      )}

      {existing.map((connection) => (
        <DisconnectForm key={connection.id} connection={connection} />
      ))}
    </div>
  );
}

function ProviderCard({
  provider,
  label,
  fields,
  connections,
  platformConnectEnabled,
}: {
  provider: string;
  label: string;
  fields: readonly string[];
  connections: ProviderConnectionView[];
  platformConnectEnabled: boolean;
}) {
  const [useOwnKeys, setUseOwnKeys] = useState(false);
  const existing = connections.filter((c) => c.provider === provider);
  const hasPlatformLink = existing.some((c) => c.authMode === "platform");
  // Stripe always leads with the platform link (ADR-013); pasted keys are the
  // Advanced fallback. A platform-linked row and keys are mutually exclusive,
  // so the card offers exactly one of the two paths at a time.
  const platformPath = provider === "stripe" && !hasPlatformLink && existing.length === 0;
  const mode = hasPlatformLink || (platformPath && !useOwnKeys) ? "platform" : "keys";

  return (
    <section className="section-panel" data-padding="default">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold tracking-tight">{label}</h2>
        <div className="mt-1">
          <ConnectionSummary connections={existing} />
        </div>
      </div>

      <div className="mt-4">
        {mode === "platform" ? (
          <>
            <StripePlatformConnect existing={existing} enabled={platformConnectEnabled} />
            {platformPath ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Advanced:{" "}
                <button
                  type="button"
                  className="font-medium underline underline-offset-4"
                  onClick={() => setUseOwnKeys(true)}
                >
                  use your own Stripe keys instead
                </button>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <CredentialForm provider={provider} fields={fields} existing={existing} />
            {platformPath ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  className="font-medium underline underline-offset-4"
                  onClick={() => setUseOwnKeys(false)}
                >
                  Connect with Stripe instead
                </button>
              </p>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

/** Surfaces the `?stripe=` outcome the Connect return route redirects with. */
export function StripeConnectNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const result = searchParams.get("stripe");

  useEffect(() => {
    if (!result) return;
    if (result === "ready") toast.success("Stripe connected. You can now take card payments on your invoices.");
    else if (result === "action_required") toast.error("Stripe still needs more information before you can accept payments.");
    else if (result === "error") toast.error("Stripe could not be connected. Please try again.");
    router.replace(pathname, { scroll: false });
  }, [pathname, result, router]);

  return null;
}

export function ProviderConnectionManager({
  connections,
  platformConnectEnabled,
}: {
  connections: ProviderConnectionView[];
  platformConnectEnabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-6">
      {PROVIDERS.map((p) => (
        <ProviderCard
          key={p.value}
          provider={p.value}
          label={p.label}
          fields={p.fields}
          connections={connections}
          platformConnectEnabled={platformConnectEnabled}
        />
      ))}
    </div>
  );
}
