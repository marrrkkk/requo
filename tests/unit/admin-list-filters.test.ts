import { describe, expect, it } from "vitest";

import {
  adminBusinessesListFiltersSchema,
  adminInvoicesListFiltersSchema,
  adminSubscriptionsListFiltersSchema,
  adminUsersListFiltersSchema,
} from "@/features/admin/schemas";

/**
 * Regression guard for the search-param mismatch.
 *
 * The admin filter toolbars write `q` to the URL while the list queries read
 * `search`. Before the two were reconciled, typing in the search box was a
 * silent no-op: the URL changed, the schema dropped the value, and the result
 * set never moved.
 */
describe("features/admin/schemas search param aliasing", () => {
  it("reads the `q` param the filter toolbars actually write", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "alice" });

    expect(result.success).toBe(true);
    expect(result.data?.search).toBe("alice");
  });

  it("still accepts the legacy `search` param", () => {
    const result = adminBusinessesListFiltersSchema.safeParse({
      search: "acme",
    });

    expect(result.success).toBe(true);
    expect(result.data?.search).toBe("acme");
  });

  it("prefers `search` when both params are present", () => {
    const result = adminSubscriptionsListFiltersSchema.safeParse({
      q: "old",
      search: "new",
    });

    expect(result.data?.search).toBe("new");
  });

  it("takes the first value when Next supplies a repeated param", () => {
    const result = adminUsersListFiltersSchema.safeParse({
      q: ["first", "second"],
    });

    expect(result.data?.search).toBe("first");
  });

  it("trims surrounding whitespace", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "  bob  " });

    expect(result.data?.search).toBe("bob");
  });

  it("treats a blank search as absent", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "   " });

    expect(result.data?.search).toBeUndefined();
  });

  it("never exposes `q` on the parsed filter object", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "alice" });

    expect(result.data && "q" in result.data).toBe(false);
  });

  it("drops an over-long search without failing the whole parse", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "x".repeat(200) });

    expect(result.success).toBe(true);
    expect(result.data?.search).toBeUndefined();
    expect(result.data?.page).toBe(1);
  });

  it("keeps pagination defaults when only a search is present", () => {
    const result = adminUsersListFiltersSchema.safeParse({ q: "alice" });

    expect(result.data?.search).toBe("alice");
    expect(result.data?.page).toBe(1);
    expect(result.data?.pageSize).toBe(25);
  });

  it("falls back to `all` only for an unrecognised status value", () => {
    // `.catch("all")` fires on a *failed* parse, not on a missing param — an
    // absent status stays `undefined`, so consumers read `filters.status ?? "all"`.
    const missing = adminUsersListFiltersSchema.safeParse({});
    const invalid = adminUsersListFiltersSchema.safeParse({ status: "nonsense" });

    expect(missing.data).not.toHaveProperty("status");
    expect(invalid.data?.status).toBe("all");
  });

  it("keeps the domain filters alongside the search", () => {
    const users = adminUsersListFiltersSchema.safeParse({
      q: "a",
      status: "suspended",
    });
    const businesses = adminBusinessesListFiltersSchema.safeParse({
      q: "a",
      plan: "pro",
    });
    const subscriptions = adminSubscriptionsListFiltersSchema.safeParse({
      q: "a",
      status: "active",
      provider: "polar",
    });

    expect(users.data?.status).toBe("suspended");
    expect(businesses.data?.plan).toBe("pro");
    expect(subscriptions.data?.status).toBe("active");
    expect(subscriptions.data?.provider).toBe("polar");
  });

  it("parses the invoice status filter alongside the search", () => {
    const invoices = adminInvoicesListFiltersSchema.safeParse({
      q: "INV-1",
      status: "overdue",
    });

    expect(invoices.data?.search).toBe("INV-1");
    expect(invoices.data?.status).toBe("overdue");
  });

  it("parses an empty param set into usable pagination defaults", () => {
    const result = adminUsersListFiltersSchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ page: 1, pageSize: 25 });
  });
});
