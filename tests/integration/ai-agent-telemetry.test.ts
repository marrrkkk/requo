import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

vi.mock("@/lib/db/client", async () => {
  const { testDb: mockedDb } = await import("../support/db");

  return { db: mockedDb };
});

import { aiAgentSessions } from "@/lib/db/schema";
import {
  failAgentRun,
  loadAgentRun,
  loadBusinessRuns,
  loadSessionRuns,
  startAgentRun,
  updateAgentRun,
} from "@/features/ai-agent/telemetry";

import { closeTestDb, testDb } from "@/tests/support/db";
import { createActiveAgentSession } from "@/tests/support/ai-agent";
import {
  cleanupWorkflowFixture,
  createWorkflowFixture,
  type WorkflowFixtureIds,
} from "@/tests/support/fixtures/workflow";

const prefix = "test_ai_agent_telemetry";
let ids: WorkflowFixtureIds;

describe("ai-agent telemetry runs", () => {
  beforeAll(async () => {
    ids = await createWorkflowFixture(prefix);
  }, 30_000);

  afterAll(async () => {
    await cleanupWorkflowFixture(prefix);
    await closeTestDb();
  }, 30_000);

  it("starts a run in the running state with zero token counts", async () => {
    const session = await createActiveAgentSession(ids.businessId);

    const run = await startAgentRun({
      businessId: ids.businessId,
      sessionId: session.sessionId,
      model: "gpt-4o-mini",
      provider: "openrouter",
    });

    expect(run.id).toMatch(/^agr_/);
    expect(run).toMatchObject({
      businessId: ids.businessId,
      sessionId: session.sessionId,
      model: "gpt-4o-mini",
      provider: "openrouter",
      status: "running",
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(run.startedAt).toBeInstanceOf(Date);
    expect(run.completedAt).toBeNull();

    const stored = await loadAgentRun(run.id);
    expect(stored).toMatchObject({ status: "running", error: null });
  });

  it("updates a run with completion data and a persisted cost estimate", async () => {
    const session = await createActiveAgentSession(ids.businessId);

    const run = await startAgentRun({
      businessId: ids.businessId,
      sessionId: session.sessionId,
      model: "gpt-3.5-turbo",
      provider: "groq",
    });

    await updateAgentRun({
      runId: run.id,
      status: "completed",
      inputTokens: 1000,
      outputTokens: 2000,
      estimatedCostCents: computeExpectedCost(1000, 2000, "gpt-3.5-turbo"),
      completedAt: new Date("2026-05-01T00:00:00.000Z"),
    });

    const stored = await loadAgentRun(run.id);

    expect(stored?.status).toBe("completed");
    expect(stored?.inputTokens).toBe(1000);
    expect(stored?.outputTokens).toBe(2000);
    expect(stored?.completedAt).toEqual(new Date("2026-05-01T00:00:00.000Z"));
    // Drizzle stores numeric columns as strings via postgres-js.
    expect(Number(stored?.estimatedCostCents)).toBeCloseTo(
      computeExpectedCost(1000, 2000, "gpt-3.5-turbo"),
      2,
    );
  });

  it("merges metadata on successive updates", async () => {
    const session = await createActiveAgentSession(ids.businessId);

    const run = await startAgentRun({
      businessId: ids.businessId,
      sessionId: session.sessionId,
      model: "gemini-2.0-flash",
      provider: "gemini",
      metadata: { searchAttempts: 1 },
    });

    await updateAgentRun({
      runId: run.id,
      metadata: { stepCount: 3 },
    });

    const stored = await loadAgentRun(run.id);
    expect(stored?.metadata).toMatchObject({ searchAttempts: 1, stepCount: 3 });
  });

  it("marks a run as failed with the captured error", async () => {
    const session = await createActiveAgentSession(ids.businessId);

    const run = await startAgentRun({
      businessId: ids.businessId,
      sessionId: session.sessionId,
      model: "llama-3.1-8b",
      provider: "groq",
    });

    await failAgentRun({ runId: run.id, error: "Provider timeout" });

    const stored = await loadAgentRun(run.id);

    expect(stored?.status).toBe("failed");
    expect(stored?.error).toBe("Provider timeout");
    expect(stored?.completedAt).toBeInstanceOf(Date);
  });

  it("loads runs by session and business with ordering and paging", async () => {
    const session = await createActiveAgentSession(ids.businessId);
    const session2 = await createActiveAgentSession(ids.businessId);

    const runIds: string[] = [];

    for (const target of [session.sessionId, session.sessionId, session2.sessionId]) {
      const run = await startAgentRun({
        businessId: ids.businessId,
        sessionId: target,
        model: "gpt-4o-mini",
        provider: "openrouter",
      });
      runIds.push(run.id);
    }

    const sessionRuns = await loadSessionRuns(session.sessionId);
    expect(sessionRuns.map((run) => run.id)).toEqual(
      runIds.slice(0, 2),
    );

    const businessRuns = await loadBusinessRuns(ids.businessId);
    expect(businessRuns.length).toBeGreaterThanOrEqual(3);

    const latest = await loadBusinessRuns(ids.businessId, { limit: 2 });
    expect(latest).toHaveLength(2);

    const offsetRuns = await loadBusinessRuns(ids.businessId, { offset: 2 });
    expect(offsetRuns[0].id).toBe(businessRuns[2].id);

    // The other business never sees these runs.
    expect(
      await loadBusinessRuns(ids.otherBusinessId),
    ).toHaveLength(0);
  });

  it("cascades run rows when the session is removed", async () => {
    const otherSession = await createActiveAgentSession(ids.otherBusinessId);
    const run = await startAgentRun({
      businessId: ids.otherBusinessId,
      sessionId: otherSession.sessionId,
      model: "gpt-4o-mini",
      provider: "openrouter",
    });

    expect(await loadAgentRun(run.id)).not.toBeNull();

    await testDb
      .delete(aiAgentSessions)
      .where(eq(aiAgentSessions.id, otherSession.sessionId));

    expect(await loadAgentRun(run.id)).toBeNull();
  });
});

function computeExpectedCost(inputTokens: number, outputTokens: number, model: string) {
  const pricing: Record<string, { input: number; output: number }> = {
    default: { input: 50, output: 150 },
    "gpt-4": { input: 3000, output: 6000 },
    "gpt-3.5": { input: 50, output: 150 },
    "claude-3": { input: 300, output: 1500 },
    gemini: { input: 35, output: 105 },
    llama: { input: 20, output: 20 },
  };
  let tier = pricing.default;
  for (const [key, value] of Object.entries(pricing)) {
    if (model.toLowerCase().includes(key)) {
      tier = value;
      break;
    }
  }
  const cost = (inputTokens / 1_000_000) * tier.input + (outputTokens / 1_000_000) * tier.output;
  return Math.round(cost * 100) / 100;
}