import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/lib/db/client";
import {
  approvalChains,
  approvals,
  type Approval,
  type ApprovalChain,
} from "@/lib/db/schema";
import { hashOpaqueToken } from "@/lib/security/tokens";

export type ApprovalTokenView = {
  approval: Approval;
  chain: ApprovalChain;
};

async function _getApprovalByCustomerToken(
  token: string,
): Promise<ApprovalTokenView | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;

  const [row] = await db
    .select({ approval: approvals, chain: approvalChains })
    .from(approvals)
    .innerJoin(approvalChains, eq(approvals.chainId, approvalChains.id))
    .where(
      and(
        eq(approvals.customerTokenHash, hashOpaqueToken(trimmed)),
        eq(approvals.businessId, approvalChains.businessId),
      ),
    )
    .limit(1);

  return row ?? null;
}

/** Token-scoped public read. Possession grants exactly the linked operation. */
export const getApprovalByCustomerToken = cache(_getApprovalByCustomerToken);

export async function listChainHistoryForBusiness(input: {
  businessId: string;
  chainId: string;
}) {
  return db
    .select()
    .from(approvals)
    .where(
      and(
        eq(approvals.businessId, input.businessId),
        eq(approvals.chainId, input.chainId),
      ),
    )
    .orderBy(desc(approvals.version));
}

export async function listPendingApprovalsForBusiness(businessId: string) {
  return db
    .select({ approval: approvals, chain: approvalChains })
    .from(approvals)
    .innerJoin(approvalChains, eq(approvals.chainId, approvalChains.id))
    .where(
      and(
        eq(approvals.businessId, businessId),
        eq(approvals.state, "pending"),
      ),
    )
    .orderBy(desc(approvals.createdAt));
}
