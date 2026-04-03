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

export default function PublicNotFound() {
  return (
    <div className="page-wrap flex min-h-screen items-center py-10">
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader className="gap-5">
          <BrandMark />
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Unavailable link</span>
            <CardTitle className="text-3xl">This public page is unavailable.</CardTitle>
            <CardDescription className="max-w-xl text-sm leading-7">
              The inquiry or quote link may be incorrect, expired, or no longer shared by the business.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 bg-background px-4 py-3 text-sm leading-6 text-muted-foreground">
            If you were expecting access, contact the business owner and ask for a fresh link.
          </div>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-end">
          <Button asChild variant="outline">
            <Link href="/">Back to QuoteFlow</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
