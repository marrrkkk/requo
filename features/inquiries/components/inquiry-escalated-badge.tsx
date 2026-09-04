import { Badge } from "@/components/ui/badge";

/**
 * Flag for inquiries escalated from public chat to a human.
 * Surfaced in the inbox so a waiting customer is visible in the queue.
 */
export function InquiryEscalatedBadge() {
  return (
    <Badge variant="destructive" title="Escalated from public chat — needs a human reply">
      Needs human
    </Badge>
  );
}
