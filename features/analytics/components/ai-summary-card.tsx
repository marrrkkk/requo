import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AISummaryCardProps = {
  summary: string | null; // null = unavailable
};

/**
 * Displays a single-sentence AI-generated insight about the analytics data.
 * Falls back to "Summary unavailable." when the summary is null.
 */
export function AISummaryCard({ summary }: AISummaryCardProps) {
  return (
    <Card className="gap-0 bg-background/72">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-muted-foreground" />
          AI Insight
        </CardTitle>
        <CardDescription>AI-generated summary of your analytics.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground">
          {summary ?? "Summary unavailable."}
        </p>
      </CardContent>
    </Card>
  );
}
