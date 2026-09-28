import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db/client";
import { changeOrderLines, changeOrders } from "@/lib/db/schema";

export async function listChangeOrdersForQuote(input: {
  businessId: string;
  quoteId: string;
}) {
  return db
    .select()
    .from(changeOrders)
    .where(
      and(
        eq(changeOrders.businessId, input.businessId),
        eq(changeOrders.quoteId, input.quoteId),
      ),
    )
    .orderBy(asc(changeOrders.coNumber));
}

export async function getChangeOrderForBusiness(input: {
  businessId: string;
  changeOrderId: string;
}) {
  const [co] = await db
    .select()
    .from(changeOrders)
    .where(
      and(
        eq(changeOrders.id, input.changeOrderId),
        eq(changeOrders.businessId, input.businessId),
      ),
    )
    .limit(1);

  if (!co) return null;

  const deltas = await db
    .select()
    .from(changeOrderLines)
    .where(eq(changeOrderLines.changeOrderId, co.id))
    .orderBy(asc(changeOrderLines.position));

  return { ...co, deltas };
}

export async function getChangeOrderByApprovalChain(chainId: string) {
  const [co] = await db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.approvalChainId, chainId))
    .limit(1);

  if (!co) return null;

  const deltas = await db
    .select()
    .from(changeOrderLines)
    .where(eq(changeOrderLines.changeOrderId, co.id))
    .orderBy(asc(changeOrderLines.position));

  return { ...co, deltas };
}

export async function listRecentChangeOrdersForBusiness(
  businessId: string,
  limit = 20,
) {
  return db
    .select()
    .from(changeOrders)
    .where(eq(changeOrders.businessId, businessId))
    .orderBy(desc(changeOrders.createdAt))
    .limit(limit);
}
