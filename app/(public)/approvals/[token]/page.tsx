import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { getApprovalByCustomerToken } from "@/features/approvals/queries";
import {
  PublicApprovalDecideForms,
  PublicChangeOrderDecideForms,
} from "@/features/approvals/components/public-approval-forms";
import { getChangeOrderByApprovalChain } from "@/features/change-orders/queries";
import { recordAnalyticsEvent } from "@/features/analytics/tracking";
import { hashOpaqueToken } from "@/lib/security/tokens";

const approvalRouteParamsSchema = z.object({
  token: z.string().min(1).max(128),
});

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Review request",
    description: "Review and respond to a business request.",
    robots: { index: false, follow: false },
  };
}

function formatSubjectKind(kind: string) {
  return kind.replace(/_/g, " ");
}

export default async function PublicApprovalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const parsedParams = approvalRouteParamsSchema.safeParse(await params);

  if (!parsedParams.success) {
    notFound();
  }

  const token = parsedParams.data.token;
  const view = await getApprovalByCustomerToken(token);

  if (!view) {
    notFound();
  }

  const { approval, chain } = view;
  const snapshot = approval.snapshot as Record<string, unknown>;
  const title = String(snapshot["title"] ?? "Review request");
  const decided = approval.state !== "pending";

  await recordAnalyticsEvent({
    businessId: approval.businessId,
    quoteId: chain.quoteId,
    eventType: "approval_viewed",
    visitorHash: hashOpaqueToken(`${approval.businessId}:approval:${approval.id}`),
    metadata: { subjectKind: chain.subjectType, approvalChainId: chain.id, actor: "customer" },
  }).catch(() => undefined);

  const changeOrder =
    chain.subjectType === "final_count"
      ? await getChangeOrderByApprovalChain(chain.id)
      : null;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <p className="meta-label">Review request · {formatSubjectKind(chain.subjectType)}</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-sm text-muted-foreground">
          Version {approval.version} of this request.
          {approval.expiresAt
            ? ` Respond by ${approval.expiresAt.toLocaleDateString()}.`
            : ""}
        </p>
      </header>

      {approval.state === "approved" ? (
        <p className="soft-panel p-4 text-sm text-foreground">
          Approved{approval.approverName ? ` by ${approval.approverName}` : ""}. Thank you.
        </p>
      ) : null}
      {approval.state === "changes_requested" ? (
        <p className="soft-panel p-4 text-sm text-foreground">
          Feedback sent to the business. Thank you.
        </p>
      ) : null}
      {approval.state === "expired" ? (
        <p className="soft-panel p-4 text-sm text-foreground">
          This request expired. Please ask the business for a new link.
        </p>
      ) : null}
      {approval.state === "superseded" ? (
        <p className="soft-panel p-4 text-sm text-foreground">
          A newer version of this request exists. Please use the latest link.
        </p>
      ) : null}

      {changeOrder ? (
        <ChangeOrderDeltaView
          token={token}
          displayNumber={changeOrder.displayNumber}
          reason={changeOrder.reason}
          customerExplanation={changeOrder.customerExplanation}
          deltas={changeOrder.deltas.map((delta) => ({
            targetKind: delta.targetKind,
            change: delta.change,
            before: delta.beforeSnapshot,
            after: delta.afterSnapshot,
          }))}
          decided={decided}
        />
      ) : null}

      {!decided && !changeOrder ? (
        <PublicApprovalDecideForms token={token} />
      ) : null}

      <p className="text-xs text-muted-foreground">
        This link is personal to you — please don&apos;t forward it.
      </p>
    </main>
  );
}

function ChangeOrderDeltaView({
  token,
  displayNumber,
  reason,
  customerExplanation,
  deltas,
  decided,
}: {
  token: string;
  displayNumber: string;
  reason: string;
  customerExplanation: string | null;
  deltas: Array<{
    targetKind: string;
    change: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  }>;
  decided: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="soft-panel flex flex-col gap-2 p-4">
        <h2 className="text-sm font-semibold text-foreground">
          Change {displayNumber}
        </h2>
        <p className="text-sm text-muted-foreground">{reason}</p>
        {customerExplanation ? (
          <p className="text-sm text-foreground">{customerExplanation}</p>
        ) : null}
      </section>

      <section className="soft-panel flex flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold text-foreground">What changed</h3>
        <ul className="flex flex-col gap-2">
          {deltas.map((delta, index) => (
            <li key={index} className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {delta.targetKind.replace("_", " ")} · {delta.change}
              </span>
              <DeltaPreview before={delta.before} after={delta.after} />
            </li>
          ))}
        </ul>
      </section>

      {!decided ? (
        <PublicChangeOrderDecideForms token={token} />
      ) : null}
    </div>
  );
}

function DeltaPreview({
  before,
  after,
}: {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}) {
  const summarize = (value: Record<string, unknown> | null) => {
    if (!value) return "—";
    const description = value["description"] ?? value["label"] ?? value["kind"];
    const quantity = value["quantity"] ?? value["position"];
    return [description, quantity].filter((part) => part !== undefined && part !== null).join(" · ").slice(0, 160) || "—";
  };

  return (
    <span className="block text-xs">
      {String(summarize(before))} → {String(summarize(after))}
    </span>
  );
}
