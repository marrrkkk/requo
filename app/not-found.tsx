import Link from "next/link";

import { BrandMark } from "@/components/shared/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="page-wrap flex min-h-screen items-center py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="gap-5">
          <BrandMark />
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Page not found</span>
            <CardTitle className="text-3xl">That page does not exist.</CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7">
              The link may be outdated, the record may have been removed, or the URL may be incomplete.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            Start from the homepage or return to your dashboard to continue working.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/">Go home</Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
