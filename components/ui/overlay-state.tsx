"use client"

import * as React from "react"

type ControllableOpenStateProps = {
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

const OVERLAY_EXIT_DURATION_MS = 220

export function useControllableOpenState({
  defaultOpen = false,
  onOpenChange,
  open,
}: ControllableOpenStateProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const isControlled = open !== undefined
  const resolvedOpen = isControlled ? open : uncontrolledOpen

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen)
      }

      onOpenChange?.(nextOpen)
    },
    [isControlled, onOpenChange]
  )

  return [resolvedOpen, setOpen] as const
}

export function useOverlayPresence(
  open: boolean,
  exitDurationMs = OVERLAY_EXIT_DURATION_MS
) {
  const [isPresent, setIsPresent] = React.useState(open)

  React.useEffect(() => {
    if (open) {
      setIsPresent(true)
      return
    }

    if (!isPresent) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setIsPresent(false)
    }, exitDurationMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [exitDurationMs, isPresent, open])

  return open || isPresent
}
