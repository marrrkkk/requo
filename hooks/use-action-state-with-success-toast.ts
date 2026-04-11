"use client";

import { useActionState } from "react";
import { toast } from "sonner";

type SuccessActionState = {
  success?: string;
};

type UseActionStateWithSuccessToastOptions<State extends SuccessActionState> = {
  getMessage?: (state: State) => string;
  toastId?: string;
};

export function useActionStateWithSuccessToast<
  State extends SuccessActionState,
>(
  action: (
    state: Awaited<State>,
    formData: FormData,
  ) => State | Promise<State>,
  initialState: Awaited<State>,
  options?: UseActionStateWithSuccessToastOptions<State>,
) {
  return useActionState<State, FormData>(async (prevState, formData) => {
    const nextState = await action(prevState, formData);

    if (nextState.success) {
      toast.success(options?.getMessage?.(nextState) ?? nextState.success, {
        id: options?.toastId,
      });
    }

    return nextState;
  }, initialState);
}
