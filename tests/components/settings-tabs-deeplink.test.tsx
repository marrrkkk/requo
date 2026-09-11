import { describe, expect, it, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { AssistantSettingsTabs } from "@/features/settings/components/assistant-settings-tabs";
import { QuoteSettingsTabs } from "@/features/settings/components/quote-settings-tabs";

/**
 * Settings tab deep-link tests.
 *
 * Both the Assistant and Quote settings surfaces keep their tabs in the URL
 * hash (#assistant/#knowledge, #quote/#templates) so entries are linkable
 * from the command menu and survive reloads. These tests pin the default
 * tab, hash-driven selection on load, and hash updates on tab clicks.
 */

function setHash(hash: string) {
  window.location.hash = hash;
  // jsdom fires hashchange asynchronously; dispatch synchronously instead.
  window.dispatchEvent(new Event("hashchange"));
}

afterEach(() => {
  window.location.hash = "";
});

describe("AssistantSettingsTabs", () => {
  it("selects the Assistant tab by default", () => {
    render(
      <AssistantSettingsTabs
        assistant={<div>Assistant body</div>}
        knowledge={<div>Knowledge body</div>}
      />,
    );

    expect(screen.getByText("Assistant body")).toBeInTheDocument();
    expect(screen.queryByText("Knowledge body")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /assistant/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("selects the Knowledge base tab from the URL hash on load", () => {
    window.location.hash = "#knowledge";
    render(
      <AssistantSettingsTabs
        assistant={<div>Assistant body</div>}
        knowledge={<div>Knowledge body</div>}
      />,
    );

    expect(screen.getByText("Knowledge body")).toBeInTheDocument();
    expect(screen.queryByText("Assistant body")).not.toBeInTheDocument();
  });

  it("ignores an unknown hash and keeps the default tab", () => {
    window.location.hash = "#nope";
    render(
      <AssistantSettingsTabs
        assistant={<div>Assistant body</div>}
        knowledge={<div>Knowledge body</div>}
      />,
    );

    expect(screen.getByText("Assistant body")).toBeInTheDocument();
  });

  it("writes the hash when switching tabs and follows hash changes", () => {
    render(
      <AssistantSettingsTabs
        assistant={<div>Assistant body</div>}
        knowledge={<div>Knowledge body</div>}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("tab", { name: /knowledge base/i }));
    });
    expect(window.location.hash).toBe("#knowledge");    expect(screen.getByText("Knowledge body")).toBeInTheDocument();

    act(() => {
      setHash("#assistant");
    });
    expect(screen.getByText("Assistant body")).toBeInTheDocument();
  });
});

describe("QuoteSettingsTabs", () => {
  it("selects the Quote tab by default", () => {
    render(
      <QuoteSettingsTabs
        quote={<div>Quote body</div>}
        templates={<div>Templates body</div>}
      />,
    );

    expect(screen.getByText("Quote body")).toBeInTheDocument();
    expect(screen.queryByText("Templates body")).not.toBeInTheDocument();
  });

  it("selects the Templates tab from the URL hash on load", () => {
    window.location.hash = "#templates";
    render(
      <QuoteSettingsTabs
        quote={<div>Quote body</div>}
        templates={<div>Templates body</div>}
      />,
    );

    expect(screen.getByText("Templates body")).toBeInTheDocument();
    expect(screen.queryByText("Quote body")).not.toBeInTheDocument();
  });

  it("writes the hash when switching tabs", () => {
    render(
      <QuoteSettingsTabs
        quote={<div>Quote body</div>}
        templates={<div>Templates body</div>}
      />,
    );

    act(() => {
      fireEvent.click(screen.getByRole("tab", { name: /templates/i }));
    });
    expect(window.location.hash).toBe("#templates");
    expect(screen.getByText("Templates body")).toBeInTheDocument();
  });
});
