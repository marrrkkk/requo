import { describe, expect, it } from "vitest";

import {
  getDatabaseConnectionOptions,
  isSupabasePoolerDatabaseUrl,
} from "@/lib/db/connection-options";

describe("db connection options", () => {
  it("caps the runtime pool for Supabase pooler URLs", () => {
    const url =
      "postgresql://postgres.project:password@aws-ap-southeast-1.pooler.supabase.com:6543/postgres";

    expect(isSupabasePoolerDatabaseUrl(url)).toBe(true);
    expect(getDatabaseConnectionOptions(url)).toMatchObject({
      connect_timeout: 5,
      prepare: false,
      max: 1,
      idle_timeout: 20,
    });
  });

  it("keeps a larger pool for direct or local database URLs", () => {
    const url = "postgresql://postgres:postgres@127.0.0.1:5432/requo";

    expect(isSupabasePoolerDatabaseUrl(url)).toBe(false);
    expect(getDatabaseConnectionOptions(url)).toMatchObject({
      connect_timeout: 5,
      prepare: false,
      max: 10,
    });
    expect(getDatabaseConnectionOptions(url)).not.toHaveProperty("idle_timeout");
  });

  it("falls back to non-pooler defaults for malformed URLs", () => {
    expect(isSupabasePoolerDatabaseUrl("not-a-url")).toBe(false);
    expect(getDatabaseConnectionOptions("not-a-url")).toMatchObject({
      connect_timeout: 5,
      prepare: false,
      max: 10,
    });
  });
});
