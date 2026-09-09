import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

vi.mock("@dnd-kit/core", () => ({
  closestCenter: vi.fn(),
  DndContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  KeyboardSensor: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  arrayMove: vi.fn((arr: unknown[], from: number, to: number) => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  }),
  sortableKeyboardCoordinates: vi.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    setActivatorNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const refreshMock = vi.fn();

vi.mock("@/hooks/use-deferred-refresh", () => ({
  useDeferredRefresh: () => ({ scheduleRefresh: refreshMock }),
}));

import { BusinessEmailTemplateForm } from "@/features/settings/components/business-email-template-form";
import { defaultQuoteEmailTemplate } from "@/features/settings/email-templates";

function makeSettings() {
  return {
    id: "biz_1",
    businessId: "biz_1",
    businessSlug: "acme",
    plan: "business",
    name: "Acme",
    slug: "acme",
    recordState: "active",
    archivedAt: null,
    deletedAt: null,
    activeBusinessCount: 1,
    countryCode: "US",
    shortDescription: null,
    contactEmail: "hello@acme.test",
    logoStoragePath: null,
    logoContentType: null,
    defaultEmailSignature: null,
    defaultQuoteNotes: null,
    defaultQuoteTerms: null,
    quoteEmailTemplate: defaultQuoteEmailTemplate(),
    defaultQuoteValidityDays: 14,
    sendInquiryAckEmail: true,
    autoDraftQuoteOnQualify: true,
    autoArchiveStaleInquiries: true,
    autoArchiveStaleInquiryDays: 14,
    autoFollowUpOnQuoteViewed: false,
    quoteViewedFollowUpDelayDays: 3,
    notifyInAppOnNewInquiry: true,
    notifyInAppOnQuoteSent: true,
    notifyInAppOnQuoteResponse: true,
    notifyInAppOnMemberInviteResponse: true,
    notifyPushOnNewInquiry: false,
    notifyPushOnQuoteSent: false,
    notifyPushOnQuoteResponse: false,
    notifyPushOnMemberInviteResponse: false,
    notifyInAppOnFollowUpReminder: true,
    notifyInAppOnQuoteExpiring: true,
    defaultCurrency: "USD",
    aiAgentEnabled: false,
    aiAgentTone: "friendly",
    updatedAt: new Date("2026-01-01"),
  } as unknown as Parameters<typeof BusinessEmailTemplateForm>[0]["settings"];
}

describe("email template builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderForm() {
    return render(
      <BusinessEmailTemplateForm action={vi.fn(async () => ({}))} settings={makeSettings()} />,
    );
  }

  it("renders block canvas without the preset row", () => {
    renderForm();
    expect(screen.queryByText("Start from:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Professional" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Friendly" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Concise" })).toBeNull();
    expect(screen.getByText("Email content")).toBeInTheDocument();
    expect(screen.getByText("Live preview")).toBeInTheDocument();
    expect(screen.getByText("Greeting")).toBeInTheDocument();
    expect(screen.getAllByText("Quote summary").length).toBeGreaterThanOrEqual(1);
  });

  it("adds a text block from the palette", async () => {
    const user = userEvent.setup();
    renderForm();
    const before = screen.queryAllByText("Text").length;
    await user.click(screen.getByRole("button", { name: /Add text/ }));
    expect(screen.queryAllByText("Text").length).toBeGreaterThan(before);
  });

  it("adds divider and spacer blocks", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Add divider/ }));
    expect(screen.getByText("Divider")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Add spacer/ }));
    expect(screen.getByText("Spacer")).toBeInTheDocument();
  });

  it("deletes a repeatable block but not singletons", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Add text/ }));
    const deleteButtons = screen.getAllByRole("button", { name: /Delete .* block/ });
    expect(deleteButtons.length).toBeGreaterThan(0);
    // Singleton cards (greeting, CTA, summary) expose no delete button.
    expect(screen.queryByRole("button", { name: "Delete Greeting block" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Delete CTA block" })).toBeNull();
    await user.click(deleteButtons[0]);
    expect(screen.getByText(/of 20 blocks used/)).toBeInTheDocument();
  });

  it("toggles visibility and edits text content", async () => {
    const user = userEvent.setup();
    renderForm();
    const greetingBox = screen.getByLabelText("Greeting text") as HTMLTextAreaElement;
    await user.clear(greetingBox);
    await user.type(greetingBox, "Hello there,");
    expect(greetingBox.value).toContain("Hello there,");

    const hideIntro = screen.getByRole("button", { name: "Hide Intro block" });
    await user.click(hideIntro);
    expect(screen.getByRole("button", { name: "Show Intro block" })).toBeInTheDocument();
  });

  it("edits the CTA label", async () => {
    const user = userEvent.setup();
    renderForm();
    const ctaInput = screen.getByLabelText("Button label") as HTMLInputElement;
    await user.clear(ctaInput);
    await user.type(ctaInput, "Open your quote");
    expect(ctaInput.value).toBe("Open your quote");
  });

  it("inserts a merge tag into a text block", async () => {
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Add text/ }));
    const textareas = screen.getAllByLabelText("Paragraph text");
    const target = textareas[textareas.length - 1] as HTMLTextAreaElement;
    await user.click(target);
    const insertButtons = screen.getAllByRole("button", { name: "Customer name" });
    await user.click(insertButtons[insertButtons.length - 1]);
    expect(target.value).toContain("{{customerName}}");
  });

  it("disables the palette at the 20-block limit", async () => {
    const { BlockPalette } = await import(
      "@/features/settings/components/email-template-builder/BlockPalette"
    );
    const { unmount } = render(
      <BlockPalette blockCount={20} onAdd={vi.fn()} />,
    );
    expect(screen.getByText(/Block limit reached/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add text/ })).toBeDisabled();
    unmount();

    // Adding a block updates the usage count.
    const user = userEvent.setup();
    renderForm();
    await user.click(screen.getByRole("button", { name: /Add text/ }));
    expect(screen.getByText(/10 of 20 blocks used/)).toBeInTheDocument();
  });

  it("exposes drag handles with accessible labels", () => {
    renderForm();
    expect(
      screen.getByRole("button", { name: /Reorder Greeting block/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Reorder CTA block/ }),
    ).toBeInTheDocument();
  });

  it("shows validation errors for subject and blocks", () => {
    render(
      <BusinessEmailTemplateForm
        action={vi.fn(async () => ({
          error: "Check the email template settings and try again.",
          fieldErrors: {
            subject: ["Enter a subject line."],
            blocks: ["The template needs exactly one call-to-action block."],
          },
        }))}
        settings={makeSettings()}
      />,
    );
    expect(screen.getByLabelText("Subject line")).toBeInTheDocument();
  });
});
