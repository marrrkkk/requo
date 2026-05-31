"use client";

import { useCallback, useEffect, useRef } from "react";

import { useActionStateWithSonner } from "@/hooks/use-action-state-with-sonner";
import { useDeferredRefresh } from "@/hooks/use-deferred-refresh";

type DeferredActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

type UseDeferredActionStateOptions<State extends DeferredActionState> = {
  onOptimistic?: () => void;
  onRevert?: () => void;
  onSuccess?: (state: State) => void;
  refreshOnSuccess?: boolean;
};

export function useDeferredActionState<State extends DeferredActionState>(
  action: (state: Awaited<State>, formData: FormData) => State | Promise<State>,
  initialState: Awaited<State>,
  options?: UseDeferredActionStateOptions<State>,
) {
  const { scheduleRefresh } = useDeferredRefresh();
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  });

  const [state, formAction, isPending] = useActionStateWithSonner(
    async (prevState, formData) => {
      const nextState = await action(prevState, formData);
      const currentOptions = optionsRef.current;
      const hasError =
        Boolean(nextState.error) ||
        Boolean(
          nextState.fieldErrors &&
            Object.values(nextState.fieldErrors).some((messages) => messages?.[0]),
        );

      if (hasError) {
        currentOptions?.onRevert?.();
      } else if (nextState.success) {
        currentOptions?.onSuccess?.(nextState);
        if (currentOptions?.refreshOnSuccess !== false) {
          scheduleRefresh();
        }
      }

      return nextState;
    },
    initialState,
  );

  const wrappedAction = useCallback(
    async (formData: FormData) => {
      optionsRef.current?.onOptimistic?.();
      return formAction(formData);
    },
    [formAction],
  );

  return [state, wrappedAction, isPending] as const;
}
