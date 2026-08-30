"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import {
  requestDemo,
  type RequestDemoState,
} from "@/features/marketing/actions/request-demo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const initialState: RequestDemoState = {};

export function BookDemoDialog({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(requestDemo, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Handle success / error feedback
  useEffect(() => {
    if (state.success) {
      toast.success("Request sent! We'll be in touch soon.");
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state]);

  // Close dialog on success after a brief delay
  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => setOpen(false), 1500);

      return () => clearTimeout(timer);
    }
  }, [state.success]);

  // Reset form when dialog reopens
  useEffect(() => {
    if (open) {
      formRef.current?.reset();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book a demo</DialogTitle>
          <DialogDescription>
            Tell us a bit about your business and we&rsquo;ll reach out to schedule a walkthrough.
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <DialogBody className="flex flex-col items-center gap-3 py-8 text-center">
            <CheckCircle2 className="size-10 text-primary" />
            <p className="text-sm font-medium text-foreground">
              We&rsquo;ve received your request!
            </p>
            <p className="text-xs text-muted-foreground">
              We&rsquo;ll get back to you shortly.
            </p>
          </DialogBody>
        ) : (
          <form ref={formRef} action={formAction}>
            <DialogBody className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-name"
                  name="name"
                  placeholder="Your name"
                  required
                  autoFocus
                  aria-invalid={!!state.fieldErrors?.name}
                />
                {state.fieldErrors?.name?.[0] && (
                  <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="demo-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  required
                  aria-invalid={!!state.fieldErrors?.email}
                />
                {state.fieldErrors?.email?.[0] && (
                  <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="demo-message">
                  Message <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="demo-message"
                  name="message"
                  placeholder="Tell us about your business or what you'd like to see..."
                  rows={3}
                  aria-invalid={!!state.fieldErrors?.message}
                />
                {state.fieldErrors?.message?.[0] && (
                  <p className="text-xs text-destructive">{state.fieldErrors.message[0]}</p>
                )}
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Send request"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
