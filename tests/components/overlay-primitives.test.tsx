import { afterEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

afterEach(() => {
  cleanup()
  document.body.removeAttribute("data-scroll-locked")
  vi.useRealTimers()
})

describe("overlay primitives", () => {
  it("renders the shared dialog backdrop without scroll locking the body", () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Quick actions</DialogTitle>
          <DialogDescription>
            Create records, export data, and open tools.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]')

    expect(screen.getByRole("dialog", { name: "Quick actions" })).toBeInTheDocument()
    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute("data-state", "open")
    expect(overlay).toHaveClass("modal-backdrop")
    expect(document.body).not.toHaveAttribute("data-scroll-locked")
  })

  it("keeps the shared backdrop styling when dialog overlay motion is customized", () => {
    render(
      <Dialog open={true}>
        <DialogContent
          overlayClassName="duration-0 data-open:animate-none data-closed:animate-none"
        >
          <DialogTitle>Preview</DialogTitle>
          <DialogDescription>Review the current page draft.</DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]')

    expect(overlay).not.toBeNull()
    expect(overlay).toHaveClass("modal-backdrop")
    expect(overlay).toHaveClass("duration-0")
    expect(document.body).not.toHaveAttribute("data-scroll-locked")
  })

  it("renders the shared sheet backdrop without scroll locking the body", () => {
    render(
      <Sheet open={true}>
        <SheetContent side="right">
          <SheetTitle>Insert saved pricing</SheetTitle>
          <SheetDescription>
            Choose saved pricing to reuse in the current quote.
          </SheetDescription>
        </SheetContent>
      </Sheet>
    )

    const overlay = document.body.querySelector('[data-slot="sheet-overlay"]')

    expect(
      screen.getByRole("dialog", { name: "Insert saved pricing" })
    ).toBeInTheDocument()
    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute("data-state", "open")
    expect(overlay).toHaveClass("modal-backdrop")
    expect(document.body).not.toHaveAttribute("data-scroll-locked")
  })

  it("keeps the dialog backdrop mounted and interactive during the close transition", () => {
    vi.useFakeTimers()

    const { rerender } = render(
      <Dialog open={true}>
        <DialogContent>
          <DialogTitle>Quick actions</DialogTitle>
          <DialogDescription>
            Create records, export data, and open tools.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )

    rerender(
      <Dialog open={false}>
        <DialogContent>
          <DialogTitle>Quick actions</DialogTitle>
          <DialogDescription>
            Create records, export data, and open tools.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    )

    const overlay = document.body.querySelector('[data-slot="dialog-overlay"]')

    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute("data-state", "closed")
    expect(overlay).not.toHaveClass("pointer-events-none")
    expect(screen.getByRole("dialog", { name: "Quick actions" })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(220)
    })

    expect(document.body.querySelector('[data-slot="dialog-overlay"]')).toBeNull()
    expect(screen.queryByRole("dialog", { name: "Quick actions" })).not.toBeInTheDocument()
  })

  it("keeps the sheet backdrop mounted and interactive during the close transition", () => {
    vi.useFakeTimers()

    const { rerender } = render(
      <Sheet open={true}>
        <SheetContent side="right">
          <SheetTitle>Insert saved pricing</SheetTitle>
          <SheetDescription>
            Choose saved pricing to reuse in the current quote.
          </SheetDescription>
        </SheetContent>
      </Sheet>
    )

    rerender(
      <Sheet open={false}>
        <SheetContent side="right">
          <SheetTitle>Insert saved pricing</SheetTitle>
          <SheetDescription>
            Choose saved pricing to reuse in the current quote.
          </SheetDescription>
        </SheetContent>
      </Sheet>
    )

    const overlay = document.body.querySelector('[data-slot="sheet-overlay"]')

    expect(overlay).not.toBeNull()
    expect(overlay).toHaveAttribute("data-state", "closed")
    expect(overlay).not.toHaveClass("pointer-events-none")
    expect(
      screen.getByRole("dialog", { name: "Insert saved pricing" })
    ).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(220)
    })

    expect(document.body.querySelector('[data-slot="sheet-overlay"]')).toBeNull()
    expect(
      screen.queryByRole("dialog", { name: "Insert saved pricing" })
    ).not.toBeInTheDocument()
  })
})
