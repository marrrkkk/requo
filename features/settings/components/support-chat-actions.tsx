"use client";

import { CircleHelp, LifeBuoy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  openCrispHelp,
  openCrispHelpdesk,
} from "@/components/integrations/crisp/crisp-chat-widget";

type SupportChatActionsProps = {
  crispEnabled: boolean;
};

export function SupportChatActions({ crispEnabled }: SupportChatActionsProps) {
  function notifyUnavailable() {
    toast.message("Live chat is not configured yet.");
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        onClick={crispEnabled ? openCrispHelp : notifyUnavailable}
      >
        <LifeBuoy data-icon="inline-start" />
        Open support chat
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={crispEnabled ? openCrispHelpdesk : notifyUnavailable}
      >
        <CircleHelp data-icon="inline-start" />
        Open help center
      </Button>
    </div>
  );
}
