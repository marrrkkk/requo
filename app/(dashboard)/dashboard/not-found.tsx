import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[28rem] items-center justify-center">
      <Card className="w-full max-w-2xl">
        <CardHeader className="gap-3">
          <span className="eyebrow">Not found</span>
          <CardTitle className="text-3xl">That dashboard record could not be found.</CardTitle>
          <CardDescription className="max-w-xl text-sm leading-7">
            It may belong to a different workspace, the link may be stale, or the record may no longer exist.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            Return to the overview or reopen the item from the dashboard lists.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/dashboard/inquiries">Open inquiries</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Back to overview</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
