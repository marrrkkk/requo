import { describe, expect, it } from "vitest";

import {
  buildApprovalSnapshot,
  hashApprovalSnapshot,
} from "@/features/approvals/snapshots";

describe("approval snapshots", () => {
  it("hashes deterministically regardless of key order", () => {
    const a = buildApprovalSnapshot({
      subjectType: "proof",
      title: "T",
      state: { b: 2, a: 1 },
    });
    const b = buildApprovalSnapshot({
      subjectType: "proof",
      title: "T",
      state: { a: 1, b: 2 },
    });

    expect(hashApprovalSnapshot(a)).toBe(hashApprovalSnapshot(b));
    expect(hashApprovalSnapshot(a)).toHaveLength(64);
  });

  it("changes the hash when state changes", () => {
    const a = buildApprovalSnapshot({ subjectType: "asset", title: "T", state: { v: 1 } });
    const b = buildApprovalSnapshot({ subjectType: "asset", title: "T", state: { v: 2 } });

    expect(hashApprovalSnapshot(a)).not.toBe(hashApprovalSnapshot(b));
  });
});
