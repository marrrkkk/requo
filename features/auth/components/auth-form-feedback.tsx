"use client";

import { CircleAlert, CircleCheckBig } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type AuthFormFeedbackProps = {
  error?: string;
  success?: string;
};

export function AuthFormFeedback({
  error,
  success,
}: AuthFormFeedbackProps) {
  if (!error && !success) {
    return null;
  }

  const isError = Boolean(error);

  return (
    <Alert variant={isError ? "destructive" : "default"}>
      {isError ? <CircleAlert /> : <CircleCheckBig />}
      <AlertTitle>
        {isError ? "We couldn't complete that request." : "Request received."}
      </AlertTitle>
      <AlertDescription>{error ?? success}</AlertDescription>
    </Alert>
  );
}
