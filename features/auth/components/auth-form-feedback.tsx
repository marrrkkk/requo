"use client";

import { CircleAlert, CircleCheckBig } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AuthFormFeedbackProps = {
  error?: string;
  success?: string;
  errorTitle?: string;
  successTitle?: string;
};

export function AuthFormFeedback({
  error,
  success,
  errorTitle,
  successTitle,
}: AuthFormFeedbackProps) {
  if (!error && !success) {
    return null;
  }

  const isError = Boolean(error);

  return (
    <Alert variant={isError ? "destructive" : "default"}>
      {isError ? <CircleAlert /> : <CircleCheckBig />}
      <AlertTitle>
        {isError
          ? (errorTitle ?? "We couldn't complete that request.")
          : (successTitle ?? "Request received.")}
      </AlertTitle>
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
