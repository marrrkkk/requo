import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/ai/requests",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

import { AdminDataTable } from "@/features/admin/components/primitives/admin-data-table";

type Row = { id: string };

const columns = [
  { id: "name", header: "Name", cell: (row: Row) => <span>{row.id}</span> },
];

/**
 * `AdminDataTable` renders `toolbar`, the table/empty branch, and `pagination`
 * as sibling expressions — a dynamic children array React reconciles as a
 * list. `toolbar` and `pagination` are nodes created by the calling component,
 * so each slot is wrapped in a keyed `Fragment` to avoid React's
 * "Each child in a list should have a unique key" warning.
 *
 * These tests pin the slot contract: every slot renders, in order, with no
 * extra wrapper elements introduced by the keyed `Fragment`s.
 */
describe("AdminDataTable slots", () => {
  it("renders toolbar, table, and pagination in order", () => {
    const { container } = render(
      <AdminDataTable
        columns={columns}
        empty={{ title: "Nothing", description: "No rows" }}
        getRowId={(row) => row.id}
        pagination={<div data-testid="pagination">pagination</div>}
        rows={[{ id: "a" }]}
        toolbar={<div data-testid="toolbar">toolbar</div>}
      />,
    );

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByText("a")).toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();

    // Fragments add no DOM, so the three slots stay direct children of the
    // outer container, in the order toolbar -> table -> pagination.
    const outer = container.firstElementChild;
    expect(outer).not.toBeNull();
    const directChildren = Array.from(outer!.children).map((child) => {
      if (child.getAttribute("data-testid") === "toolbar") return "toolbar";
      if (child.getAttribute("data-testid") === "pagination") return "pagination";
      return "content";
    });
    expect(directChildren).toEqual(["toolbar", "content", "pagination"]);
  });

  it("omits absent slots instead of rendering empty wrappers", () => {
    const { container } = render(
      <AdminDataTable
        columns={columns}
        empty={{ title: "Nothing", description: "No rows" }}
        getRowId={(row) => row.id}
        rows={[{ id: "a" }]}
      />,
    );

    const outer = container.firstElementChild;
    expect(outer).not.toBeNull();
    expect(outer!.children).toHaveLength(1);
    expect(screen.queryByTestId("toolbar")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pagination")).not.toBeInTheDocument();
  });

  it("renders the empty state when there are no rows", () => {
    render(
      <AdminDataTable
        columns={columns}
        empty={{ title: "No rows yet", description: "They will appear here." }}
        getRowId={(row) => row.id}
        pagination={<div data-testid="pagination">pagination</div>}
        rows={[]}
      />,
    );

    expect(screen.getByText("No rows yet")).toBeInTheDocument();
    expect(screen.getByTestId("pagination")).toBeInTheDocument();
  });
});
